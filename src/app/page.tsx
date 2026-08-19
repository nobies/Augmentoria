'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Tv,
  Film,
  Play,
  ArrowRight,
  Shield,
  Layers,
  Users,
  CheckCircle2,
  Lock,
  Zap,
  Mic,
  Sliders,
  Building2,
  Clock,
  Eye,
  Check,
  ChevronDown,
  X,
  Sparkles,
  ArrowDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { SEED_COMPANIES, SEED_USERS } from '@/lib/tenantStorage';
import { AugmentoriaLogo } from '@/components/brand/AugmentoriaLogo';

export default function LandingPage() {
  const router = useRouter();
  const { currentCompany, currentUser, switchCompany, switchUser } = useAuth();

  // Auth / Login Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('sarah@vortexpost.com');
  const [loginPassword, setLoginPassword] = useState('••••••••••••');
  const [selectedStudioId, setSelectedStudioId] = useState('comp_vortex');

  // Selected Studio preview tab
  const [activeStudioTab, setActiveStudioTab] = useState('comp_vortex');
  const activeStudioObj = SEED_COMPANIES.find(c => c.id === activeStudioTab) || SEED_COMPANIES[0];

  const handleQuickLogin = async (userId: string, companyId: string) => {
    await switchCompany(companyId);
    await switchUser(userId);
    setIsLoginModalOpen(false);
    router.push('/dashboard');
  };

  const handleLoginFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const matchedUser = SEED_USERS.find(u => u.companyId === selectedStudioId) || SEED_USERS[0];
    await switchCompany(selectedStudioId);
    await switchUser(matchedUser.id);
    setIsLoginModalOpen(false);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-100 selection:bg-slate-700 selection:text-white relative flex flex-col font-sans">
      {/* ---------------------------------------------------- */}
      {/* ATMOSPHERIC SERENE CINEMATIC BACKGROUND */}
      {/* ---------------------------------------------------- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle dark vignette gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#05070a] via-transparent to-[#05070a] z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/30 via-[#05070a]/90 to-[#05070a] z-10" />
        
        {/* Gentle calm ambient lighting */}
        <div className="absolute top-[-15%] left-[20%] w-[600px] h-[600px] rounded-full bg-slate-800/10 blur-[160px]" />
        <div className="absolute top-[40%] right-[10%] w-[500px] h-[500px] rounded-full bg-indigo-950/15 blur-[180px]" />
      </div>

      {/* ---------------------------------------------------- */}
      {/* FLOATING GLASSMORPHIC PILL NAVBAR */}
      {/* ---------------------------------------------------- */}
      <div className="sticky top-5 z-50 px-4 sm:px-8 max-w-5xl mx-auto w-full">
        <header className="backdrop-blur-2xl bg-[#090d14]/75 border border-[#1b2333]/80 rounded-full px-5 py-3 shadow-2xl shadow-black/60 flex items-center justify-between transition">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2">
            <AugmentoriaLogo size={28} textClassName="text-sm sm:text-base font-black tracking-tight text-white group-hover:text-slate-300 transition" />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
            <a href="#overview" className="hover:text-white transition">Overview</a>
            <a href="#capabilities" className="hover:text-white transition">Capabilities</a>
            <a href="#studios" className="hover:text-white transition">Studios</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <Link href="/screener" className="text-slate-300 hover:text-white flex items-center gap-1">
              <Tv className="w-3 h-3 text-slate-400" />
              <span>Live Screener</span>
            </Link>
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#141b29] transition"
            >
              Sign In
            </button>
            <Link
              href="/dashboard"
              className="px-4 py-1.5 rounded-full bg-white hover:bg-slate-200 text-black text-xs font-bold shadow-lg transition active:scale-95 flex items-center gap-1"
            >
              <span>Studio Hub</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </header>
      </div>

      {/* ---------------------------------------------------- */}
      {/* HERO SECTION — CALM, CLEAN, EDITORIAL LUXURY */}
      {/* ---------------------------------------------------- */}
      <section className="relative min-h-[82vh] flex flex-col items-center justify-center text-center px-4 sm:px-8 max-w-4xl mx-auto space-y-7 z-20 pt-8">
        {/* Subtle Micro-Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0c111c] border border-[#1d273a] text-slate-400 text-[11px] font-medium tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span>Synchronized Post-Production Suite</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-normal text-white tracking-tight leading-[1.15] font-serif">
          Crafted for Cinema.<br />
          <span className="italic text-slate-300">Engineered for Precision.</span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed font-sans">
          A dedicated post-production workspace for modern media studios. Frame-accurate video reviews, synchronized client screeners, and multi-tenant pipeline governance.
        </p>

        {/* Understated Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="px-6 py-2.5 rounded-full bg-white hover:bg-slate-200 text-black text-xs font-bold transition shadow-lg flex items-center gap-2"
          >
            <span>Explore Studio Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            href="/screener"
            className="px-6 py-2.5 rounded-full bg-[#101624] hover:bg-[#161f33] border border-[#212c42] text-slate-300 text-xs font-medium transition flex items-center gap-2"
          >
            <Play className="w-3 h-3 fill-current text-slate-400" />
            <span>Launch Screener</span>
          </Link>
        </div>

        {/* Scroll Indicator */}
        <div className="pt-10 flex flex-col items-center gap-1.5 text-[11px] text-slate-500">
          <span>Scroll to explore</span>
          <ArrowDown className="w-3.5 h-3.5 animate-bounce text-slate-600" />
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* SECTION 1: OVERVIEW & PHILOSOPHY */}
      {/* ---------------------------------------------------- */}
      <section id="overview" className="relative z-20 py-20 px-4 sm:px-8 max-w-5xl mx-auto w-full border-t border-[#121926] space-y-12">
        <div className="max-w-2xl space-y-3">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Philosophy</span>
          <h2 className="text-2xl sm:text-3xl font-serif text-white">Quiet Focus. Uncompromising Standards.</h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Augmentoria replaces noisy, fragmented feedback channels with a calm, darkroom environment designed specifically for editors, colorists, sound designers, and directors.
          </p>
        </div>

        {/* 3 Calm Capability Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-[#090d15] border border-[#161e2e] space-y-3">
            <Film className="w-5 h-5 text-slate-400" />
            <h3 className="text-sm font-bold text-white">Frame-Accurate Timecodes</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every drawing annotation, voice recording, and comment locks to the exact SMPTE frame number (24, 25, 29.97, 60 FPS).
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#090d15] border border-[#161e2e] space-y-3">
            <Building2 className="w-5 h-5 text-slate-400" />
            <h3 className="text-sm font-bold text-white">Multi-Tenant Isolation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Manage dozens of production companies, clients, and teams with strict data separation and custom branding per tenant.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#090d15] border border-[#161e2e] space-y-3">
            <Shield className="w-5 h-5 text-slate-400" />
            <h3 className="text-sm font-bold text-white">Passwordless Screeners</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Send secure, tamper-proof magic links directly to executive clients for instant review and approval without login friction.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* SECTION 2: CAPABILITIES SHOWCASE */}
      {/* ---------------------------------------------------- */}
      <section id="capabilities" className="relative z-20 py-20 px-4 sm:px-8 max-w-5xl mx-auto w-full border-t border-[#121926] space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Capabilities</span>
            <h2 className="text-2xl sm:text-3xl font-serif text-white">The Post-Production Toolchain</h2>
          </div>
          <Link href="/screener" className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition">
            <span>Try in Screener Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Version Lineage & Compare */}
          <div className="p-7 rounded-3xl bg-[#090d15] border border-[#161e2e] space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase">01 • Video Comparison</span>
              <h3 className="text-base font-bold text-white">Split & Wipe Version Comparison</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Compare Cut A (raw assembly) vs Cut B (graded VFX master) with synchronized scrubbing and sub-frame accuracy.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#06080d] border border-[#131926] flex items-center justify-between text-xs font-mono text-slate-400">
              <span>v1 Assembly</span>
              <span className="text-slate-600">↔</span>
              <span className="text-slate-200">v2 Graded Master</span>
            </div>
          </div>

          {/* Card 2: Voice & Vector Annotations */}
          <div className="p-7 rounded-3xl bg-[#090d15] border border-[#161e2e] space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase">02 • Collaborative Review</span>
              <h3 className="text-base font-bold text-white">Vector Canvas & Voice Memos</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Draw directly on video frames with custom brushes, arrows, and circles. Record quick voice notes attached directly to timecodes.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#06080d] border border-[#131926] flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Mic className="w-3.5 h-3.5 text-slate-500" />
                <span>Voice Memo (0:14)</span>
              </span>
              <span className="text-slate-500">TC: 01:04:12:08</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* SECTION 3: 10 MULTI-TENANT STUDIOS DIRECTORY */}
      {/* ---------------------------------------------------- */}
      <section id="studios" className="relative z-20 py-20 px-4 sm:px-8 max-w-5xl mx-auto w-full border-t border-[#121926] space-y-10">
        <div className="space-y-2">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Multi-Tenancy</span>
          <h2 className="text-2xl sm:text-3xl font-serif text-white">10 Production Studios Built-In</h2>
          <p className="text-xs text-slate-400">Explore pre-configured studio workspaces, clients, and role assignments.</p>
        </div>

        {/* Studio Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {SEED_COMPANIES.map(c => {
            const isActive = c.id === activeStudioTab;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveStudioTab(c.id)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-black font-bold shadow'
                    : 'bg-[#0a0e17] text-slate-400 hover:text-white border border-[#182133]'
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        {/* Selected Studio Details Card */}
        <div className="p-7 rounded-3xl bg-[#090d15] border border-[#161e2e] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                style={{ backgroundColor: activeStudioObj.brandPrimary }}
                className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black text-white"
              >
                {activeStudioObj.name.charAt(0)}
              </div>
              <h3 className="text-lg font-bold text-white">{activeStudioObj.name}</h3>
              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded-full bg-[#111726] border border-[#1f2a3f]">
                {activeStudioObj.plan} Plan
              </span>
            </div>
            <p className="text-xs text-slate-400">{activeStudioObj.tagline}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                switchCompany(activeStudioObj.id);
                router.push('/dashboard');
              }}
              className="px-5 py-2 rounded-full bg-white hover:bg-slate-200 text-black text-xs font-bold transition"
            >
              Enter Workspace
            </button>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* SECTION 4: TRANSPARENT PRICING */}
      {/* ---------------------------------------------------- */}
      <section id="pricing" className="relative z-20 py-20 px-4 sm:px-8 max-w-5xl mx-auto w-full border-t border-[#121926] space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Pricing</span>
          <h2 className="text-2xl sm:text-3xl font-serif text-white">Simple, Predictable Plans</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter */}
          <div className="p-7 rounded-3xl bg-[#090d15] border border-[#161e2e] flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400">Starter</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-light text-white">$29</span>
                <span className="text-xs text-slate-500">/mo</span>
              </div>
              <p className="text-xs text-slate-400">For freelance editors and indie filmmakers.</p>
              <ul className="space-y-2 text-xs text-slate-300 pt-3 border-t border-[#151c2c]">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-slate-400" /> Up to 3 Projects</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-slate-400" /> Frame-Accurate Screener</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-slate-400" /> 1 Studio Workspace</li>
              </ul>
            </div>
            <Link href="/dashboard" className="w-full py-2 rounded-full bg-[#121824] hover:bg-[#182130] text-slate-200 text-xs font-semibold text-center block transition">
              Get Started
            </Link>
          </div>

          {/* Pro */}
          <div className="p-7 rounded-3xl bg-[#0c111c] border border-slate-700 flex flex-col justify-between gap-6 shadow-xl">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Pro Studio</span>
                <span className="text-[10px] font-bold text-slate-300 px-2 py-0.5 rounded-full bg-slate-800">Popular</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-light text-white">$79</span>
                <span className="text-xs text-slate-500">/mo</span>
              </div>
              <p className="text-xs text-slate-400">For post-production houses and VFX teams.</p>
              <ul className="space-y-2 text-xs text-slate-200 pt-3 border-t border-[#1e273a]">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-white" /> Unlimited Projects & Cuts</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-white" /> Multi-Tenant Studio Switcher</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-white" /> Split / Wipe Video Compare</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-white" /> Client Magic Link Review</li>
              </ul>
            </div>
            <Link href="/dashboard" className="w-full py-2 rounded-full bg-white hover:bg-slate-200 text-black text-xs font-bold text-center block shadow transition">
              Launch Pro Studio
            </Link>
          </div>

          {/* Enterprise */}
          <div className="p-7 rounded-3xl bg-[#090d15] border border-[#161e2e] flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400">Enterprise</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-light text-white">$199</span>
                <span className="text-xs text-slate-500">/mo</span>
              </div>
              <p className="text-xs text-slate-400">For broadcast facilities and agencies.</p>
              <ul className="space-y-2 text-xs text-slate-300 pt-3 border-t border-[#151c2c]">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-slate-400" /> Custom Domain & White-Label</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-slate-400" /> Unlimited Team & Roles</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-slate-400" /> 24/7 Dedicated Support</li>
              </ul>
            </div>
            <Link href="/dashboard" className="w-full py-2 rounded-full bg-[#121824] hover:bg-[#182130] text-slate-200 text-xs font-semibold text-center block transition">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* FOOTER */}
      {/* ---------------------------------------------------- */}
      <footer className="border-t border-[#121926] bg-[#040608] px-4 sm:px-8 py-10 mt-auto text-slate-500 text-xs z-20">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AugmentoriaLogo size={22} textClassName="font-bold text-white text-xs" />
            <span>© 2026 Augmentoria Inc. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="hover:text-white transition">Studio Hub</Link>
            <Link href="/projects" className="hover:text-white transition">Projects</Link>
            <Link href="/screener" className="hover:text-white transition">Screener Studio</Link>
            <Link href="/team" className="hover:text-white transition">Team & Roles</Link>
          </div>
        </div>
      </footer>

      {/* ---------------------------------------------------- */}
      {/* INTEGRATED AUTH / LOGIN MODAL */}
      {/* ---------------------------------------------------- */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#090d15] border border-[#1b2538] rounded-3xl shadow-2xl p-6 sm:p-7 relative animate-in fade-in zoom-in-95 space-y-5">
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#141c2c] transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AugmentoriaLogo size={24} textClassName="font-bold text-white text-sm" />
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-medium">SaaS Portal</span>
              </div>
              <h3 className="text-base font-bold text-white">Sign In to Studio Workspace</h3>
              <p className="text-xs text-slate-400 mt-0.5">Access synchronized video reviews and projects.</p>
            </div>

            {/* 1-Click Quick Demo Switcher */}
            <div className="p-3.5 rounded-2xl bg-[#06080d] border border-[#141b2b] space-y-2.5">
              {/* Super Admin Master Shortcut */}
              <button
                type="button"
                onClick={() => handleQuickLogin('user_super_admin', 'comp_vortex')}
                className="w-full p-2.5 rounded-xl bg-gradient-to-r from-purple-950/60 to-indigo-950/60 hover:from-purple-900/60 hover:to-indigo-900/60 border border-purple-500/40 text-left transition flex items-center justify-between shadow"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">👑</span>
                  <div>
                    <span className="text-xs font-bold text-white block">Adam Vance (Global Super Admin)</span>
                    <span className="text-[9px] text-purple-300">All 10 Studios • Master Permissions</span>
                  </div>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 font-mono font-bold">
                  Master
                </span>
              </button>

              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                ⚡ Studio Member Demo Profiles:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('user_sarah', 'comp_vortex')}
                  className="p-2 rounded-xl bg-[#0d121c] hover:bg-[#141b2a] border border-[#1a2336] text-left transition"
                >
                  <span className="text-xs font-bold text-white block">Sarah (Admin)</span>
                  <span className="text-[9px] text-slate-400">Vortex Studios</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('user_alex', 'comp_cineflow')}
                  className="p-2 rounded-xl bg-[#0d121c] hover:bg-[#141b2a] border border-[#1a2336] text-left transition"
                >
                  <span className="text-xs font-bold text-white block">Alex (Producer)</span>
                  <span className="text-[9px] text-slate-400">CineFlow Media</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('user_marcus', 'comp_neon')}
                  className="p-2 rounded-xl bg-[#0d121c] hover:bg-[#141b2a] border border-[#1a2336] text-left transition"
                >
                  <span className="text-xs font-bold text-white block">Marcus (VFX Lead)</span>
                  <span className="text-[9px] text-slate-400">Neon Horizon</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('user_client_redbull', 'comp_vortex')}
                  className="p-2 rounded-xl bg-[#0d121c] hover:bg-[#141b2a] border border-[#1a2336] text-left transition"
                >
                  <span className="text-xs font-bold text-white block">Ahmed (Client)</span>
                  <span className="text-[9px] text-slate-400">Red Bull Review</span>
                </button>
              </div>
            </div>

            {/* Standard Form */}
            <form onSubmit={handleLoginFormSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Studio Workspace</label>
                <select
                  value={selectedStudioId}
                  onChange={e => setSelectedStudioId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-slate-500"
                >
                  {SEED_COMPANIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.plan} plan)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-slate-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-white hover:bg-slate-200 text-black text-xs font-bold shadow-lg transition"
              >
                Enter Studio Workspace →
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
