'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Building2,
  Tv,
  ChevronDown,
  Sparkles,
  Shield,
  Palette,
  Plus,
  Check,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AppNavbarProps {
  onOpenBranding?: () => void;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({ onOpenBranding }) => {
  const pathname = usePathname();
  const {
    currentCompany,
    allCompanies,
    currentUser,
    companyUsers,
    switchCompany,
    switchUser,
    createNewCompany,
  } = useAuth();

  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNewCompanyModalOpen, setIsNewCompanyModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/projects', label: 'Projects', icon: FolderKanban },
    { href: '/clients', label: 'Clients', icon: Building2 },
    { href: '/team', label: 'Team', icon: Users },
    { href: '/', label: 'Screener Studio', icon: Tv, highlight: true },
  ];

  const handleCreateCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    await createNewCompany(newCompanyName.trim());
    setNewCompanyName('');
    setIsNewCompanyModalOpen(false);
    setIsCompanyDropdownOpen(false);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] font-bold">Super Admin</span>;
      case 'company_admin':
        return <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] font-bold">Admin</span>;
      case 'account_manager':
        return <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[9px] font-bold">Producer</span>;
      case 'creative':
        return <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold">Editor</span>;
      case 'client_reviewer':
        return <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">Client</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400 text-[9px] font-bold">Member</span>;
    }
  };

  return (
    <>
      <nav className="h-14 bg-[#090d16] border-b border-[#1c2438] px-3 sm:px-5 flex items-center justify-between gap-2 select-none z-40 shrink-0">
        {/* Left: Studio Tenant Switcher */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl bg-[#111724] hover:bg-[#182133] border border-[#232d44] transition group"
            >
              <div
                style={{ backgroundColor: currentCompany?.brandPrimary || '#3b82f6' }}
                className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-xs shadow-lg shadow-blue-900/30 shrink-0"
              >
                {currentCompany?.name?.charAt(0) || 'P'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black text-white leading-none block truncate max-w-[130px]">
                    {currentCompany?.name || 'Select Studio'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-white transition" />
                </div>
                <span className="text-[9px] text-slate-400 leading-none capitalize">
                  {currentCompany?.plan || 'pro'} Plan
                </span>
              </div>
            </button>

            {/* Tenant Dropdown */}
            {isCompanyDropdownOpen && (
              <div className="absolute left-0 top-12 w-64 bg-[#111724] border border-[#232d44] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Switch Workspace
                </div>
                <div className="space-y-1 my-1">
                  {allCompanies.map(c => {
                    const isSelected = c.id === currentCompany?.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          switchCompany(c.id);
                          setIsCompanyDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl transition text-left ${
                          isSelected ? 'bg-blue-600/20 border border-blue-500/50 text-white' : 'hover:bg-[#182133] text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            style={{ backgroundColor: c.brandPrimary }}
                            className="w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] text-white"
                          >
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <span className="text-xs font-bold block leading-none">{c.name}</span>
                            <span className="text-[9px] text-slate-400 capitalize">{c.plan}</span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-[#1e273b]">
                  <button
                    type="button"
                    onClick={() => setIsNewCompanyModalOpen(true)}
                    className="w-full py-1.5 px-2 rounded-xl bg-[#182133] hover:bg-[#202c44] text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-400" />
                    <span>Create New Studio Tenant</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1 bg-[#101522] p-1 rounded-xl border border-[#1e273b]">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : item.highlight
                      ? 'text-purple-300 hover:text-purple-200 hover:bg-purple-950/30'
                      : 'text-slate-400 hover:text-white hover:bg-[#182133]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: Demo Profile / Role Switcher + Studio Branding */}
        <div className="flex items-center gap-2">
          {/* Demo User Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#111724] hover:bg-[#182133] border border-[#232d44] transition group"
              title="Simulate Role / Switch User Profile"
            >
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">
                {currentUser?.name.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden xs:block">
                <span className="text-xs font-bold text-white leading-none block truncate max-w-[90px] sm:max-w-[120px]">
                  {currentUser?.name || 'User'}
                </span>
                <span className="text-[9px] text-slate-400 leading-none">
                  {getRoleBadge(currentUser?.role || 'guest')}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-white transition" />
            </button>

            {/* Profile Dropdown */}
            {isUserDropdownOpen && (
              <div className="absolute right-0 top-12 w-64 bg-[#111724] border border-[#232d44] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Demo Role Switcher</span>
                  <UserCheck className="w-3 h-3 text-blue-400" />
                </div>
                <div className="space-y-1 my-1">
                  {companyUsers.map(u => {
                    const isSelected = u.id === currentUser?.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          switchUser(u.id);
                          setIsUserDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl transition text-left ${
                          isSelected ? 'bg-blue-600/20 border border-blue-500/50 text-white' : 'hover:bg-[#182133] text-slate-300'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold block leading-none">{u.name}</span>
                          <span className="text-[9px] text-slate-400">{u.title || u.role}</span>
                        </div>
                        {getRoleBadge(u.role)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Branding Trigger */}
          {onOpenBranding && (
            <button
              type="button"
              onClick={onOpenBranding}
              className="p-2 rounded-xl bg-[#111724] hover:bg-[#182133] border border-[#232d44] text-slate-400 hover:text-white transition"
              title="Studio Theme & Branding"
            >
              <Palette className="w-4 h-4 text-orange-400" />
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden bg-[#0a0e17] border-b border-[#1c2438] px-2 py-1 flex items-center justify-around">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                isActive ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Create New Studio Modal */}
      {isNewCompanyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#111724] border border-[#232d44] rounded-2xl shadow-2xl p-5 relative animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-white mb-1">Create New Studio Tenant</h3>
            <p className="text-xs text-slate-400 mb-4">Each studio operates as a completely isolated SaaS workspace.</p>
            <form onSubmit={handleCreateCompanySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Studio Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Post Production"
                  value={newCompanyName}
                  onChange={e => setNewCompanyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewCompanyModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-[#182133] text-slate-300 text-xs font-bold hover:bg-[#202c44]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30"
                >
                  Create Studio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
