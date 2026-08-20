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
  Edit3,
  Globe,
  Palette,
  Sparkles,
  Upload,
  Check,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AppNavbar } from '@/components/shell/AppNavbar';
import { Client } from '@/lib/types';
import { PRESET_CLIENT_ACCENT_COLORS, CLIENT_INDUSTRIES } from '@/lib/theme';

export default function ClientsPage() {
  const {
    companyClients,
    companyProjects,
    addClient,
    updateClient,
    deleteClient,
    canManageCompany,
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form State for Add / Edit
  const [formName, setFormName] = useState('');
  const [formCompanyName, setFormCompanyName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formAccentColor, setFormAccentColor] = useState('#E60000');
  const [formIndustry, setFormIndustry] = useState(CLIENT_INDUSTRIES[0]);
  const [formWebsite, setFormWebsite] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const openAddModal = () => {
    setEditingClient(null);
    setFormName('');
    setFormCompanyName('');
    setFormEmail('');
    setFormPhone('');
    setFormLogoUrl('');
    setFormAccentColor('#E60000');
    setFormIndustry(CLIENT_INDUSTRIES[0]);
    setFormWebsite('');
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormName(client.name);
    setFormCompanyName(client.companyName);
    setFormEmail(client.email);
    setFormPhone(client.phone || '');
    setFormLogoUrl(client.logoUrl || '');
    setFormAccentColor(client.accentColor || '#E60000');
    setFormIndustry(client.industry || CLIENT_INDUSTRIES[0]);
    setFormWebsite(client.website || '');
    setFormNotes(client.notes || '');
    setIsAddModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    if (editingClient) {
      await updateClient(editingClient.id, {
        name: formName.trim(),
        companyName: formCompanyName.trim() || formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim() || undefined,
        logoUrl: formLogoUrl.trim() || undefined,
        accentColor: formAccentColor,
        industry: formIndustry,
        website: formWebsite.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
    } else {
      await addClient({
        name: formName.trim(),
        companyName: formCompanyName.trim() || formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim() || undefined,
        logoUrl: formLogoUrl.trim() || undefined,
        accentColor: formAccentColor,
        industry: formIndustry,
        website: formWebsite.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
    }

    setIsAddModalOpen(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFormLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredClients = companyClients.filter(
    c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.industry && c.industry.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#06080d] text-slate-100 flex flex-col select-none font-sans">
      <AppNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-7">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#182033] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono uppercase text-slate-500 tracking-wider">Client Accounts & CRM</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                {companyClients.length} Active Clients
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-white flex items-center gap-2.5">
              <span>Client Portfolio & Brand Themes</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Manage client branding, official logos, and individual UI accent themes that automatically adapt when reviewing that client&apos;s media deliverables.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {canManageCompany && (
              <button
                type="button"
                onClick={openAddModal}
                className="px-5 py-2.5 rounded-full bg-white hover:bg-slate-200 text-black text-xs font-bold flex items-center gap-1.5 transition shadow-xl active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Register New Client</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search clients by name, company, industry, or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#0b0f19] border border-[#1b2538] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white transition"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
            Showing {filteredClients.length} of {companyClients.length} accounts
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-500 space-y-3 bg-[#0b0f19] rounded-3xl border border-[#182133]">
              <Building2 className="w-12 h-12 mx-auto opacity-30 text-slate-400" />
              <p className="text-sm font-semibold text-white">No clients found matching your search</p>
              <p className="text-xs text-slate-400">Add a new client account to start linking projects and custom accent themes.</p>
            </div>
          ) : (
            filteredClients.map(client => {
              const linkedProjects = companyProjects.filter(p => p.clientId === client.id);
              const accentColor = client.accentColor || '#3b82f6';

              return (
                <div
                  key={client.id}
                  style={{ borderColor: `${accentColor}33` }}
                  className="p-6 rounded-3xl bg-[#0b0f19] border hover:border-opacity-100 transition-all duration-300 group flex flex-col justify-between gap-5 shadow-xl relative overflow-hidden"
                >
                  {/* Subtle Top Accent Glow Bar */}
                  <div
                    style={{ backgroundColor: accentColor }}
                    className="absolute top-0 left-0 right-0 h-1 opacity-70 group-hover:opacity-100 transition"
                  />

                  {/* Header & Logo */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Logo Thumbnail or Initial Accent Badge */}
                        {client.logoUrl ? (
                          <img
                            src={client.logoUrl}
                            alt={client.name}
                            className="w-12 h-12 rounded-2xl object-cover border border-[#232f48] shrink-0 bg-[#06080d]"
                          />
                        ) : (
                          <div
                            style={{ backgroundColor: accentColor }}
                            className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-base shrink-0 shadow-lg"
                          >
                            {client.name.charAt(0)}
                          </div>
                        )}

                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white truncate block group-hover:text-slate-100">
                            {client.name}
                          </h3>
                          <span className="text-xs text-slate-400 block truncate">
                            {client.companyName}
                          </span>
                        </div>
                      </div>

                      {/* Accent Color Dot & Options */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          style={{ backgroundColor: accentColor }}
                          className="w-3.5 h-3.5 rounded-full shadow-md border border-white/20"
                          title={`UI Accent Color: ${accentColor}`}
                        />
                        {canManageCompany && (
                          <button
                            type="button"
                            onClick={() => openEditModal(client)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-[#141b2a] transition"
                            title="Edit Client Brand & Settings"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Industry Tag & Website */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      {client.industry && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#121927] border border-[#1e293f] text-slate-300 font-medium">
                          {client.industry}
                        </span>
                      )}
                      {client.website && (
                        <a
                          href={client.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-white flex items-center gap-1 transition"
                        >
                          <Globe className="w-3 h-3" />
                          <span className="truncate max-w-[120px]">{client.website.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1.5 text-xs text-slate-400 pt-3 border-t border-[#161e2e]">
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
                      {client.notes && (
                        <p className="text-[11px] text-slate-400 italic line-clamp-2 pt-1">
                          &ldquo;{client.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer: Linked Projects Badge & Actions */}
                  <div className="pt-3 border-t border-[#161e2e] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-bold text-slate-200">
                        {linkedProjects.length} {linkedProjects.length === 1 ? 'Project' : 'Projects'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {linkedProjects.length > 0 ? (
                        <Link
                          href={`/projects?client=${client.id}`}
                          style={{ color: accentColor }}
                          className="text-xs font-bold hover:underline flex items-center gap-1"
                        >
                          <span>View Projects</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-[11px] text-slate-500">No active projects</span>
                      )}

                      {canManageCompany && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete "${client.name}"?`)) {
                              await deleteClient(client.id);
                            }
                          }}
                          className="p-1 rounded-lg text-slate-600 hover:text-red-400 transition"
                          title="Delete Client"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* ---------------------------------------------------- */}
      {/* ADD / EDIT CLIENT MODAL */}
      {/* ---------------------------------------------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0b0f19] border border-[#232f48] rounded-3xl shadow-2xl p-6 sm:p-7 relative animate-in fade-in zoom-in-95 my-8 space-y-6">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-5 top-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#141b29] transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div
                style={{ backgroundColor: `${formAccentColor}22`, borderColor: `${formAccentColor}55` }}
                className="w-10 h-10 rounded-2xl border flex items-center justify-center"
              >
                <Building2 style={{ color: formAccentColor }} className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {editingClient ? `Edit ${editingClient.name}` : 'Register New Client Brand'}
                </h2>
                <p className="text-xs text-slate-400">
                  Configure client contact info, official brand logo, and the UI accent color that themes their screener portal.
                </p>
              </div>
            </div>

            {/* Live Client Theme Preview */}
            <div
              style={{ borderColor: `${formAccentColor}44`, backgroundColor: `${formAccentColor}0d` }}
              className="p-4 rounded-2xl border space-y-2"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Dynamic Theme Preview (Accent: {formAccentColor})
              </span>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#070a10] border border-[#1e273b]">
                <div className="flex items-center gap-3">
                  {formLogoUrl ? (
                    <img src={formLogoUrl} alt="Logo" className="w-9 h-9 rounded-xl object-cover border border-[#2b3850]" />
                  ) : (
                    <div
                      style={{ backgroundColor: formAccentColor }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-xs shadow-md"
                    >
                      {formName ? formName.charAt(0) : 'C'}
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-bold text-white block">{formName || 'Client Brand Name'}</span>
                    <span className="text-[10px] text-slate-400 block">{formIndustry}</span>
                  </div>
                </div>
                <span
                  style={{ backgroundColor: `${formAccentColor}22`, color: formAccentColor, borderColor: `${formAccentColor}55` }}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold border"
                >
                  Custom Brand Accent
                </span>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Client Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Brand / Client Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Vodafone Group, Red Bull, Adidas"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white transition"
                  />
                </div>

                {/* Company Legal Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Legal Entity Name</label>
                  <input
                    type="text"
                    value={formCompanyName}
                    onChange={e => setFormCompanyName(e.target.value)}
                    placeholder="e.g. Vodafone Group Plc"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white transition"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Primary Contact Email *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="production@client.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white font-mono transition"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white transition"
                  />
                </div>

                {/* Industry */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Industry Vertical</label>
                  <select
                    value={formIndustry}
                    onChange={e => setFormIndustry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white transition"
                  >
                    {CLIENT_INDUSTRIES.map(ind => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Website */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Website URL</label>
                  <input
                    type="url"
                    value={formWebsite}
                    onChange={e => setFormWebsite(e.target.value)}
                    placeholder="https://clientbrand.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white font-mono transition"
                  />
                </div>
              </div>

              {/* Logo URL and File Upload */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Client Logo (PNG / SVG)</label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="url"
                    value={formLogoUrl}
                    onChange={e => setFormLogoUrl(e.target.value)}
                    placeholder="Paste Logo Image URL (e.g. https://...)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white font-mono transition"
                  />
                  <label className="cursor-pointer shrink-0 w-full sm:w-auto">
                    <div className="px-4 py-2.5 rounded-xl border border-[#232f48] bg-[#121927] hover:bg-[#182235] text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition">
                      <Upload className="w-3.5 h-3.5 text-blue-400" />
                      <span>Upload</span>
                    </div>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Accent Color Palette Selector */}
              <div className="space-y-2 pt-2 border-t border-[#182133]">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    Client Interface Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formAccentColor}
                      onChange={e => setFormAccentColor(e.target.value)}
                      className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-xs font-mono text-white font-bold">{formAccentColor}</span>
                  </div>
                </div>

                {/* Color Swatch Presets */}
                <div className="flex flex-wrap gap-2">
                  {PRESET_CLIENT_ACCENT_COLORS.map(preset => {
                    const isSelected = formAccentColor.toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setFormAccentColor(preset.hex)}
                        style={{ backgroundColor: preset.hex }}
                        className={`w-7 h-7 rounded-xl transition flex items-center justify-center text-white text-[10px] font-black shadow ${
                          isSelected ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                        }`}
                        title={`${preset.name} (${preset.hex})`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Production Notes & Specifications</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Special client requirements, aspect ratios, delivery formats..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white resize-none transition"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#182133]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#141b29] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-white hover:bg-slate-200 text-black text-xs font-bold shadow-xl transition active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingClient ? 'Save Changes' : 'Create Client'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
