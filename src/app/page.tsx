'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Tv,
  Film,
  Sparkles,
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
  ChevronRight,
  UserCheck,
  FolderKanban,
  ExternalLink,
  ChevronDown,
  X,
  Volume2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { SEED_COMPANIES, SEED_USERS } from '@/lib/tenantStorage';

export default function LandingPage() {
  const router = useRouter();
  const { currentCompany, currentUser, switchCompany, switchUser } = useAuth();

  // Auth / Login Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('sarah@vortexpost.com');
  const [loginPassword, setLoginPassword] = useState('••••••••••••');
  const [selectedStudioId, setSelectedStudioId] = useState('comp_vortex');

  // Interactive Bento Demo States
  const [activeBentoStudio, setActiveBentoStudio] = useState('comp_vortex');
  const [compareSplitPos, setCompareSplitPos] = useState(52);
  const [isPlayingAudioDemo, setIsPlayingAudioDemo] = useState(true);
  const [interactiveTc, setInteractiveTc] = useState('01:23:45:12');

  const currentBentoStudioObj = SEED_COMPANIES.find(c => c.id === activeBentoStudio) || SEED_COMPANIES[0];

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
    <div className="min-h-screen bg-[#06080d] text-slate-100 selection:bg-rose-500 selection:text-white relative overflow-hidden flex flex-col font-sans">
      {/* ---------------------------------------------------- */}
      {/* AMBIENT GLOWING ORBS (Neural Flow State Background) */}
      {/* ---------------------------------------------------- */}
      <div className="absolute top-[-10%] left-[-10%] w-[550px] sm:w-[700px] h-[550px] sm:h-[700px] rounded-full bg-rose-600/15 blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute top-[20%] right-[-10%] w-[500px] sm:w-[650px] h-[500px] sm:h-[650px] rounded-full bg-purple-600/15 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[25%] w-[600px] sm:w-[800px] h-[400px] rounded-full bg-cyan-600/10 blur-[160px] pointer-events-none" />

      {/* ---------------------------------------------------- */}
      {/* NAVBAR */}
      {/* ---------------------------------------------------- */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#06080d]/80 border-b border-[#182033]/70 px-4 sm:px-8 py-3.5 flex items-center justify-between transition">
        {/* Typographic Logo: AUGMENT:▶RIA */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 via-purple-600 to-cyan-500 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-rose-900/30 group-hover:scale-105 transition">
            ▶
          </div>
          <div className="flex items-center tracking-tight">
            <span className="font-black text-lg text-white">AUGMENT</span>
            <span className="font-mono text-rose-400 font-bold mx-0.5">:▶</span>
            <span className="font-black text-lg text-slate-200">RIA</span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-400">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#pipeline" className="hover:text-white transition">Pipeline</a>
          <a href="#studios" className="hover:text-white transition">Studios (10 Tenancy)</a>
          <a href="#pricing" className="hover:text-white transition">Pricing</a>
          <Link href="/screener" className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1">
            <Tv className="w-3.5 h-3.5" />
            <span>Live Screener</span>
          </Link>
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsLoginModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-[#111726] hover:bg-[#182238] border border-[#232f48] text-xs font-bold text-slate-200 transition"
          >
            Sign In
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white text-xs font-black shadow-lg shadow-rose-900/40 active:scale-95 transition flex items-center gap-1.5"
          >
            <span>Launch Studio Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* ---------------------------------------------------- */}
      {/* HERO SECTION */}
      {/* ---------------------------------------------------- */}
      <section className="relative pt-16 sm:pt-24 pb-12 sm:pb-20 px-4 sm:px-8 max-w-6xl mx-auto text-center space-y-7">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#141b2a]/90 border border-rose-500/30 text-rose-300 text-xs font-bold shadow-xl">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span>Augmentoria 2.0 • Neural Flow State Architecture</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1] max-w-4xl mx-auto">
          Reach Flow State in Video Post-Production &{' '}
          <span className="bg-gradient-to-r from-rose-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
            Realtime Studio Review
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base lg:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Frame-accurate timecode synchronization, on-screen vector markups, non-destructive color grading, multi-tenant studio management, and passwordless client sign-offs in a unified darkroom SaaS.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-purple-600 to-cyan-500 hover:opacity-95 text-white text-xs sm:text-sm font-black shadow-2xl shadow-rose-900/50 active:scale-95 transition flex items-center gap-2"
          >
            <span>Start Free Studio Hub</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/screener"
            className="px-6 py-3 rounded-2xl bg-[#111726]/90 hover:bg-[#182238] border border-[#232f48] text-slate-200 text-xs sm:text-sm font-bold flex items-center gap-2 transition"
          >
            <Play className="w-3.5 h-3.5 fill-current text-cyan-400" />
            <span>Launch Live Screener Demo</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsLoginModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-[#0e1320] hover:bg-[#141b2e] border border-purple-500/30 text-purple-300 text-xs sm:text-sm font-bold flex items-center gap-2 transition"
          >
            <UserCheck className="w-4 h-4 text-purple-400" />
            <span>Simulate Demo Roles</span>
          </button>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* INTERACTIVE BENTO GRID SHOWCASE */}
      {/* ---------------------------------------------------- */}
      <section id="features" className="px-4 sm:px-8 max-w-7xl mx-auto w-full pb-20 space-y-6">
        <div className="text-center space-y-2 mb-8">
          <span className="text-xs font-mono font-bold text-rose-400 tracking-wider uppercase">Interactive Bento Ecosystem</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">Engineered for High-End Post-Production</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* TILE 1: Frame-Accurate Video Scrub (2 Cols) */}
          <div className="md:col-span-2 rounded-3xl bg-[#0b0f19]/80 border border-[#1b2438] p-5 sm:p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between gap-4 group hover:border-rose-500/50 transition">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Frame-Accurate Video Scrub</span>
              </div>
              <span className="font-mono text-xs font-bold text-rose-400 px-2 py-0.5 rounded bg-[#070a12] border border-[#1e273b]">
                {interactiveTc}
              </span>
            </div>

            {/* Simulated Video Player & Filmstrip */}
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-slate-800 flex items-center justify-center group/video">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 z-10 pointer-events-none" />

              {/* Center Play Icon with Ambient Glow */}
              <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-white z-20 shadow-lg shadow-rose-900/40">
                <Play className="w-5 h-5 fill-current text-rose-400 ml-0.5" />
              </div>

              {/* On-Screen Annotation Pin */}
              <div className="absolute top-1/4 left-1/3 z-20 flex items-center gap-1 bg-rose-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                <span>Fix VFX Glitch #4</span>
              </div>

              {/* Bottom Filmstrip Scrubber */}
              <div className="absolute bottom-3 left-3 right-3 z-20 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>01:00:00:00</span>
                  <span className="text-rose-400 font-bold">SMPTE 24.00 FPS</span>
                  <span>01:05:32:18</span>
                </div>
                <div className="h-2 rounded-full bg-[#182033] relative overflow-hidden cursor-pointer">
                  <div className="absolute left-0 top-0 bottom-0 w-[42%] bg-gradient-to-r from-rose-500 to-purple-500" />
                  <div className="absolute left-[42%] top-0 bottom-0 w-1 bg-white shadow-lg" />
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Sub-frame precision indexing with SMPTE timecodes, non-destructive drawing tools, and audio waveforms.
            </p>
          </div>

          {/* TILE 2: 60fps Waveform Audio (1 Col) */}
          <div className="rounded-3xl bg-[#0b0f19]/80 border border-[#1b2438] p-5 sm:p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between gap-4 group hover:border-cyan-500/50 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">60FPS Audio Waveform</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>

            {/* Audio Waveform Graphic */}
            <div className="bg-[#070a12] p-4 rounded-2xl border border-[#182236] flex flex-col justify-center items-center gap-3 h-40">
              <div className="flex items-center gap-1.5 h-16 w-full justify-center">
                {[40, 65, 85, 30, 95, 70, 45, 80, 100, 60, 90, 50, 75, 35, 88, 62].map((height, i) => (
                  <div
                    key={i}
                    style={{ height: `${height}%` }}
                    className={`w-1.5 rounded-full transition-all duration-300 ${
                      i % 2 === 0 ? 'bg-cyan-400' : 'bg-purple-500'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between w-full text-[10px] text-slate-400 font-mono">
                <span>-24 dB</span>
                <span className="text-emerald-400 font-bold">L/R Phase OK</span>
                <span>0 dB Peak</span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Real-time voice note recordings synced to exact frames with stereo metering.
            </p>
          </div>

          {/* TILE 3: Quick Login Widget (1 Col) */}
          <div className="rounded-3xl bg-[#0b0f19]/90 border border-purple-500/30 p-5 sm:p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between gap-3 group hover:border-purple-500 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Quick Demo Login</span>
              <Lock className="w-3.5 h-3.5 text-purple-400" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] text-slate-400 block">Select a role to test RBAC:</span>
              <button
                type="button"
                onClick={() => handleQuickLogin('user_sarah', 'comp_vortex')}
                className="w-full p-2 rounded-xl bg-[#131a29] hover:bg-rose-600/20 border border-rose-500/40 text-left transition flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-white block leading-none">Sarah Jenkins</span>
                  <span className="text-[9px] text-rose-400">Company Admin @ Vortex</span>
                </div>
                <ArrowRight className="w-3 h-3 text-rose-400" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('user_leo', 'comp_vortex')}
                className="w-full p-2 rounded-xl bg-[#131a29] hover:bg-blue-600/20 border border-blue-500/40 text-left transition flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-white block leading-none">Leo Vance</span>
                  <span className="text-[9px] text-blue-400">Lead Colorist</span>
                </div>
                <ArrowRight className="w-3 h-3 text-blue-400" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('user_alex', 'comp_cineflow')}
                className="w-full p-2 rounded-xl bg-[#131a29] hover:bg-purple-600/20 border border-purple-500/40 text-left transition flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-white block leading-none">Alex Mercer</span>
                  <span className="text-[9px] text-purple-400">Production Head @ CineFlow</span>
                </div>
                <ArrowRight className="w-3 h-3 text-purple-400" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition"
            >
              Sign In Custom User
            </button>
          </div>

          {/* TILE 4: Multi-Tenant Studio Switcher (2 Cols) */}
          <div className="md:col-span-2 rounded-3xl bg-[#0b0f19]/80 border border-[#1b2438] p-5 sm:p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between gap-4 group hover:border-purple-500/50 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Multi-Tenant Studio Isolation</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                10 Studios Seeded
              </span>
            </div>

            {/* Interactive Studio List */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SEED_COMPANIES.slice(0, 6).map(c => {
                const isSelected = c.id === activeBentoStudio;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveBentoStudio(c.id)}
                    className={`p-2.5 rounded-xl text-left border transition ${
                      isSelected
                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg'
                        : 'bg-[#0e1320] border-[#1a2336] text-slate-400 hover:bg-[#141b2c]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div
                        style={{ backgroundColor: c.brandPrimary }}
                        className="w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-black text-white shrink-0"
                      >
                        {c.name.charAt(0)}
                      </div>
                      <span className="text-xs font-bold truncate block">{c.name}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 capitalize block">{c.plan} Plan</span>
                  </button>
                );
              })}
            </div>

            <div className="p-3 rounded-2xl bg-[#070a12] border border-[#182236] flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">Selected Studio: </span>
                <span className="font-bold text-white">{currentBentoStudioObj.name}</span>
                <span className="text-[10px] text-slate-500 block">{currentBentoStudioObj.tagline}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  switchCompany(currentBentoStudioObj.id);
                  router.push('/dashboard');
                }}
                className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 transition shadow"
              >
                Switch Workspace
              </button>
            </div>
          </div>

          {/* TILE 5: Side-by-Side Video Compare (2 Cols) */}
          <div className="md:col-span-2 rounded-3xl bg-[#0b0f19]/80 border border-[#1b2438] p-5 sm:p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between gap-4 group hover:border-cyan-500/50 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Side-By-Side Split & Wipe Compare</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">Split: {compareSplitPos}%</span>
            </div>

            {/* Compare Mockup */}
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-slate-800 flex items-center">
              {/* Left Half (Clip A) */}
              <div
                style={{ width: `${compareSplitPos}%` }}
                className="h-full bg-blue-950/40 border-r-2 border-white relative overflow-hidden flex items-center justify-center"
              >
                <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-blue-600 text-[9px] font-bold text-white uppercase">
                  v1 Master Assembly
                </span>
                <span className="text-xs font-mono text-blue-300">Ungraded Log Footage</span>
              </div>

              {/* Right Half (Clip B) */}
              <div className="flex-1 h-full bg-rose-950/40 relative overflow-hidden flex items-center justify-center">
                <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded bg-rose-600 text-[9px] font-bold text-white uppercase">
                  v2 Final VFX & Grade
                </span>
                <span className="text-xs font-mono text-rose-300">Rec.709 Finished Master</span>
              </div>

              {/* Drag Handle Slider */}
              <input
                type="range"
                min="10"
                max="90"
                value={compareSplitPos}
                onChange={e => setCompareSplitPos(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
              />
            </div>

            <p className="text-xs text-slate-400">
              Compare different passes in real-time with synchronized multi-stream playback and opacity blending.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 5-STAGE PRODUCTION PIPELINE */}
      {/* ---------------------------------------------------- */}
      <section id="pipeline" className="px-4 sm:px-8 max-w-6xl mx-auto w-full pb-20 space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono font-bold text-rose-400 tracking-wider uppercase">End-To-End Traceability</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">The 5-Gate Production Lifecycle</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[
            { step: '01', name: 'Ingest & Timecode Lock', desc: 'Sync MP4, YouTube, or Vimeo streams with exact SMPTE drop-frame math.' },
            { step: '02', name: 'Internal Assembly', desc: 'Creative team reviews edits with vector drawings and voice memos.' },
            { step: '03', name: 'Passwordless Screener', desc: 'Send branded magic links directly to executive clients.' },
            { step: '04', name: 'Revision Traceability', desc: 'Convert on-screen markup comments into actionable task lists.' },
            { step: '05', name: 'Final Delivery & Sign-Off', desc: 'Executive client sign-off with permanent audit logs.' },
          ].map(g => (
            <div key={g.step} className="p-4 rounded-2xl bg-[#0b0f19] border border-[#1b2438] hover:border-rose-500/40 transition flex flex-col justify-between gap-3 shadow-xl">
              <div>
                <span className="text-lg font-black text-rose-400 font-mono">{g.step}</span>
                <h3 className="text-xs font-bold text-white mt-1 mb-1">{g.name}</h3>
                <p className="text-[11px] text-slate-400 leading-snug">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* PRICING PLANS */}
      {/* ---------------------------------------------------- */}
      <section id="pricing" className="px-4 sm:px-8 max-w-5xl mx-auto w-full pb-24 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono font-bold text-purple-400 tracking-wider uppercase">Transparent Pricing</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">Choose Your Studio Tier</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Starter */}
          <div className="p-6 rounded-3xl bg-[#0b0f19] border border-[#1b2438] flex flex-col justify-between gap-6 shadow-xl">
            <div className="space-y-3">
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold">Starter</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">$29</span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              <p className="text-xs text-slate-400">For freelance editors and boutique creators.</p>
              <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-[#182236]">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-rose-400" /> Up to 3 Projects</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-rose-400" /> Frame-Accurate Screener</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-rose-400" /> 1 Studio Workspace</li>
              </ul>
            </div>
            <Link href="/dashboard" className="w-full py-2.5 rounded-xl bg-[#131a2a] hover:bg-[#1a2338] text-white text-xs font-bold text-center block transition">
              Get Started
            </Link>
          </div>

          {/* Pro (Highlighted) */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-[#161426] to-[#0b0f19] border-2 border-rose-500/70 flex flex-col justify-between gap-6 shadow-2xl relative">
            <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider">
              Most Popular
            </div>
            <div className="space-y-3">
              <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold">Pro Studio</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">$79</span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              <p className="text-xs text-slate-400">For active post-production houses and VFX studios.</p>
              <ul className="space-y-2 text-xs text-slate-200 pt-2 border-t border-[#2a1d3d]">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-rose-400" /> Unlimited Projects & Cuts</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-rose-400" /> Multi-Tenant Studio Switcher</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-rose-400" /> Split / Wipe Video Compare</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-rose-400" /> Client Magic Link Review</li>
              </ul>
            </div>
            <Link href="/dashboard" className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold text-center block shadow-lg shadow-rose-900/40 transition">
              Launch Pro Studio
            </Link>
          </div>

          {/* Enterprise */}
          <div className="p-6 rounded-3xl bg-[#0b0f19] border border-[#1b2438] flex flex-col justify-between gap-6 shadow-xl">
            <div className="space-y-3">
              <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold">Enterprise</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">$199</span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              <p className="text-xs text-slate-400">For broadcast networks and multi-facility agencies.</p>
              <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-[#182236]">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-rose-400" /> Custom Domain & White-Label</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-rose-400" /> Unlimited Team & Roles</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-rose-400" /> 24/7 Dedicated Support</li>
              </ul>
            </div>
            <Link href="/dashboard" className="w-full py-2.5 rounded-xl bg-[#131a2a] hover:bg-[#1a2338] text-white text-xs font-bold text-center block transition">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* FOOTER */}
      {/* ---------------------------------------------------- */}
      <footer className="border-t border-[#182033] bg-[#040609] px-4 sm:px-8 py-8 mt-auto text-slate-500 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-white">AUGMENT:▶RIA</span>
            <span>© 2026 Augmentoria Inc. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hover:text-white transition">Studio Hub</Link>
            <Link href="/projects" className="hover:text-white transition">Projects</Link>
            <Link href="/screener" className="hover:text-white transition">Screener Studio</Link>
            <Link href="/team" className="hover:text-white transition">Team RBAC</Link>
          </div>
        </div>
      </footer>

      {/* ---------------------------------------------------- */}
      {/* LOGIN & AUTH MODAL */}
      {/* ---------------------------------------------------- */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0b0f19] border border-[#232f48] rounded-3xl shadow-2xl p-6 sm:p-7 relative animate-in fade-in zoom-in-95 space-y-5">
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#141b2c] transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-black text-white text-base">AUGMENT:▶RIA</span>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">SaaS Portal</span>
              </div>
              <h3 className="text-lg font-black text-white">Sign In to Studio Workspace</h3>
              <p className="text-xs text-slate-400 mt-0.5">Access synchronized video reviews and production deliverables.</p>
            </div>

            {/* 1-Click Quick Demo Switcher */}
            <div className="p-3 rounded-2xl bg-[#070a12] border border-[#1a2336] space-y-2">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                ⚡ 1-Click Instant Demo Login:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('user_sarah', 'comp_vortex')}
                  className="p-2 rounded-xl bg-[#111726] hover:bg-rose-600/20 border border-rose-500/30 text-left transition"
                >
                  <span className="text-xs font-bold text-white block">Sarah (Admin)</span>
                  <span className="text-[9px] text-slate-400">Vortex Studios</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('user_alex', 'comp_cineflow')}
                  className="p-2 rounded-xl bg-[#111726] hover:bg-purple-600/20 border border-purple-500/30 text-left transition"
                >
                  <span className="text-xs font-bold text-white block">Alex (Producer)</span>
                  <span className="text-[9px] text-slate-400">CineFlow Media</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('user_marcus', 'comp_neon')}
                  className="p-2 rounded-xl bg-[#111726] hover:bg-cyan-600/20 border border-cyan-500/30 text-left transition"
                >
                  <span className="text-xs font-bold text-white block">Marcus (VFX Lead)</span>
                  <span className="text-[9px] text-slate-400">Neon Horizon</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('user_client_redbull', 'comp_vortex')}
                  className="p-2 rounded-xl bg-[#111726] hover:bg-emerald-600/20 border border-emerald-500/30 text-left transition"
                >
                  <span className="text-xs font-bold text-white block">Ahmed (Client)</span>
                  <span className="text-[9px] text-emerald-400">Red Bull Review</span>
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
                  className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-[#232f48] text-xs text-white focus:outline-none focus:border-rose-500"
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
                  className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-[#232f48] text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-[#232f48] text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white text-xs font-black shadow-lg shadow-rose-900/40 active:scale-95 transition"
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
