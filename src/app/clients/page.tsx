'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Plus,
  Search,
  Mail,
  Phone,
  FolderKanban,
  ExternalLink,
  Shield,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AppNavbar } from '@/components/shell/AppNavbar';

export default function ClientsPage() {
  const {
    companyClients,
    companyProjects,
    addClient,
    canManageCompany,
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');

  const filteredClients = companyClients.filter(
    c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientEmail.trim()) return;
    await addClient({
      name: newClientName.trim(),
      companyName: newClientCompany.trim() || newClientName.trim(),
      email: newClientEmail.trim(),
      phone: newClientPhone.trim() || undefined,
      notes: newClientNotes.trim() || undefined,
    });
    setNewClientName('');
    setNewClientCompany('');
    setNewClientEmail('');
    setNewClientPhone('');
    setNewClientNotes('');
    setIsAddClientModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#090c13] text-slate-100 flex flex-col select-none">
      <AppNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-emerald-400" />
              <span>Client Management CRM</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Directory of client organizations, brand contacts, and project delivery specifications.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {canManageCompany && (
              <button
                type="button"
                onClick={() => setIsAddClientModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-900/30 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Client</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full max-w-md bg-[#111724] border border-[#20293d] p-1.5 rounded-2xl">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search clients by name, company, or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 space-y-2">
              <Building2 className="w-10 h-10 mx-auto opacity-30 text-emerald-400" />
              <p className="text-sm font-semibold">No clients registered yet</p>
            </div>
          ) : (
            filteredClients.map(client => {
              const linkedProjects = companyProjects.filter(p => p.clientId === client.id);
              return (
                <div
                  key={client.id}
                  className="p-5 rounded-2xl bg-[#111724] border border-[#20293d] hover:border-emerald-500/50 transition group flex flex-col justify-between gap-4 shadow-xl"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black text-sm">
                        {client.companyName.charAt(0)}
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#182133] border border-[#26334d] text-slate-300 text-[10px] font-bold">
                        {linkedProjects.length} Projects
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition leading-snug">
                      {client.name}
                    </h3>
                    <span className="text-xs font-semibold text-slate-400 block mb-2">{client.companyName}</span>

                    <div className="space-y-1.5 pt-2 border-t border-[#1d2538] text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                      {client.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                    </div>

                    {client.notes && (
                      <p className="text-[11px] text-slate-500 mt-3 p-2 rounded-lg bg-[#0d121c] border border-[#1a2336] line-clamp-2">
                        {client.notes}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#1d2538] flex items-center justify-between">
                    <Link
                      href={`/projects?client=${client.id}`}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
                    >
                      <FolderKanban className="w-3.5 h-3.5" />
                      <span>View Client Projects</span>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Add Client Modal */}
      {isAddClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111724] border border-[#232d44] rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-white mb-1">Add New Client Organization</h3>
            <p className="text-xs text-slate-400 mb-4">Register client company details for review portals and white-labeling.</p>

            <form onSubmit={handleAddClientSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Name / Lead</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ahmed Rashed"
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Company / Brand Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Red Bull Media House"
                  value={newClientCompany}
                  onChange={e => setNewClientCompany(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Email</label>
                  <input
                    type="email"
                    required
                    placeholder="contact@client.com"
                    value={newClientEmail}
                    onChange={e => setNewClientEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone (Optional)</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={newClientPhone}
                    onChange={e => setNewClientPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Delivery Notes / Specifics</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Special color LUT preferences, delivery format rules..."
                  value={newClientNotes}
                  onChange={e => setNewClientNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1e273b]">
                <button
                  type="button"
                  onClick={() => setIsAddClientModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#182133] text-slate-300 text-xs font-bold hover:bg-[#202c44]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 active:scale-95 transition"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
