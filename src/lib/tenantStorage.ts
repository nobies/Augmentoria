import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  Company,
  User,
  Client,
  Project,
  Asset,
  AssetVersion,
  ReviewSession,
  ActivityLog,
} from './types';

interface TenantDB extends DBSchema {
  companies: {
    key: string;
    value: Company;
  };
  users: {
    key: string;
    value: User;
    indexes: { 'by-company': string };
  };
  clients: {
    key: string;
    value: Client;
    indexes: { 'by-company': string };
  };
  projects: {
    key: string;
    value: Project;
    indexes: { 'by-company': string; 'by-client': string };
  };
  assets: {
    key: string;
    value: Asset;
    indexes: { 'by-project': string; 'by-company': string };
  };
  assetVersions: {
    key: string;
    value: AssetVersion;
    indexes: { 'by-asset': string; 'by-project': string };
  };
  reviewSessions: {
    key: string;
    value: ReviewSession;
    indexes: { 'by-project': string; 'by-company': string };
  };
  activityLogs: {
    key: string;
    value: ActivityLog;
    indexes: { 'by-company': string; 'by-project': string };
  };
}

const DB_NAME = 'postflow_saas_db';
const DB_VERSION = 3; // Version 3: Flagship Socialeyes Studio with 50 Global Clients & 500 Projects

let dbPromise: Promise<IDBPDatabase<TenantDB>> | null = null;

// ----------------------------------------------------
// 1 FLAGSHIP STUDIO: SOCIALEYES
// ----------------------------------------------------
export const SEED_COMPANIES: Company[] = [
  {
    id: 'comp_socialeyes',
    name: 'Socialeyes Studio',
    slug: 'socialeyes',
    tagline: 'High-End Social-First Cinema & Commercial Post-Production Suite',
    description: 'Premier global post-production studio crafting viral broadcast commercials, hyper-polished social campaigns, theatrical trailers, VFX, and HDR color grading for the world’s leading 50 brands.',
    website: 'https://socialeyes.io',
    address: 'SoHo Creative Quarter, New York & Soho Square, London',
    brandPrimary: '#6366f1',
    brandSecondary: '#a855f7',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=250&auto=format&fit=crop&q=80',
    plan: 'enterprise',
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
];

// ----------------------------------------------------
// STUDIO MEMBERS & ROLES
// ----------------------------------------------------
export const SEED_USERS: User[] = [
  {
    id: 'user_super_admin',
    companyId: 'comp_socialeyes',
    accessibleCompanyIds: ['comp_socialeyes'],
    name: 'Adam Vance (Super Admin)',
    email: 'admin@augmentoria.io',
    role: 'super_admin',
    title: 'Platform Master Architect',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 100 * 86400000).toISOString(),
  },
  {
    id: 'user_marcus',
    companyId: 'comp_socialeyes',
    name: 'Marcus Thorne',
    email: 'marcus@socialeyes.io',
    role: 'company_admin',
    title: 'Studio Founder & Executive Producer',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_sarah',
    companyId: 'comp_socialeyes',
    name: 'Sarah Jenkins',
    email: 'sarah@socialeyes.io',
    role: 'company_admin',
    title: 'Creative Director & Post Supervisor',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_david',
    companyId: 'comp_socialeyes',
    name: 'David Sterling',
    email: 'david@socialeyes.io',
    role: 'creative',
    title: 'Senior Colorist & Finishing DP',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_elena',
    companyId: 'comp_socialeyes',
    name: 'Elena Rostova',
    email: 'elena@socialeyes.io',
    role: 'account_manager',
    title: 'Head of Global Client Accounts',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_maya',
    companyId: 'comp_socialeyes',
    name: 'Maya Lin',
    email: 'maya@socialeyes.io',
    role: 'creative',
    title: 'Lead VFX Compositor & Motion Designer',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_leo',
    companyId: 'comp_socialeyes',
    name: 'Leo Vance',
    email: 'leo@socialeyes.io',
    role: 'creative',
    title: 'Editorial Lead & Sound Designer',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
];

// ----------------------------------------------------
// 50 TOP GLOBAL CLIENTS UNDER SOCIALEYES
// ----------------------------------------------------
interface ClientDefinition {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  accentColor: string;
  logoUrl: string;
  industry: string;
  website: string;
  notes: string;
  projectThemes: {
    title: string;
    desc: string;
    fps: number;
    colorSpace: string;
    thumbnail: string;
    videoUrl: string;
  }[];
}

const RAW_CLIENT_DEFINITIONS: ClientDefinition[] = [
  {
    id: 'client_vodafone',
    name: 'Vodafone Group',
    companyName: 'Vodafone Group Plc',
    email: 'media@vodafone.com',
    phone: '+44 1635 33251',
    accentColor: '#E60000',
    logoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80',
    industry: 'Telecommunications & 5G',
    website: 'https://vodafone.com',
    notes: 'Primary global telecom brand. High-contrast Vodafone Red interface accent and fast turnarounds.',
    projectThemes: [
      { title: 'RED 5G — Global Network Campaign', desc: 'Cinematic 60s global broadcast spot highlighting high-speed ultra low latency smart city connectivity.', fps: 24, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Connected Future — Smart Health Doc', desc: 'Mini-documentary series on remote robotic surgery powered by 5G mobile arrays.', fps: 25, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'GigaCube Launch — Velocity Spot', desc: 'Fast-paced CGI hardware reveal emphasizing instantaneous plug & play home broadband.', fps: 30, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Summer Festival Pass — Social Reels', desc: 'Dynamic vertical 9:16 video cuts with vibrant particle simulations and festival foley.', fps: 60, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
      { title: 'Vodafone Business Cloud — Keynote Intro', desc: 'Sleek dark-mode 4K keynote film showcasing sovereign European cloud security infrastructure.', fps: 24, colorSpace: 'ACEScg', thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' },
      { title: 'Together We Can — Anthem Manifesto', desc: 'Emotional documentary brand anthem film capturing humanity connected across continents.', fps: 24, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=JGwWNGJdvx8' },
      { title: 'Vodafone IoT Fleet — Tech Breakdown', desc: 'Motion graphics 3D isometric animation illustrating global smart cargo tracking sensors.', fps: 30, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'VOXI Infinite Social — TikTok Takeover', desc: 'Ultra-fast kinetic typography and Gen-Z meme transitions for unlimited data social campaign.', fps: 60, colorSpace: 'sRGB', thumbnail: 'https://images.unsplash.com/photo-1516251193007-45ef944ab0c6?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Green Gigabit — Eco Energy Story', desc: 'Nature documentary cinematography demonstrating 100% renewable powered network towers.', fps: 25, colorSpace: 'Rec.2020', thumbnail: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'SecureNet Plus — Cyber Defense Demo', desc: 'Futuristic holographic UI composites detailing real-time phishing and ransomware shields.', fps: 24, colorSpace: 'ACEScg', thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
    ],
  },
  {
    id: 'client_redbull',
    name: 'Red Bull Media House',
    companyName: 'Red Bull GmbH',
    email: 'production@redbullmedia.com',
    phone: '+43 662 6582 0',
    accentColor: '#DC0A2D',
    logoUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=200&auto=format&fit=crop&q=80',
    industry: 'Extreme Sports & Entertainment',
    website: 'https://redbullmediahouse.com',
    notes: 'High energy grading, saturated punchy warm tones, 60fps high bitrate sports footage.',
    projectThemes: [
      { title: 'Cliff Diving World Series — Polignano Promo', desc: 'High-speed 1000fps phantom camera captures of 27m platform dives into Mediterranean seas.', fps: 25, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Rampage 2026 — Desert Freeride Master', desc: 'Brutal Utah mountain freeride cinematography with heavy dust particle simulation and foley.', fps: 24, colorSpace: 'ACEScg', thumbnail: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' },
      { title: 'Oracle Red Bull Racing — F1 Pit Stop Cinema', desc: 'Sub-2 second Formula 1 pit stop choreography shot under ultra-bright high-contrast neon rigs.', fps: 60, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Stratos Redux — Edge of Space Doc', desc: 'Archival 4K remastered feature documentary exploring the physics of supersonic human freefall.', fps: 24, colorSpace: 'Rec.2020', thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
      { title: 'Dance Your Style — World Finals Trailer', desc: 'Electrifying street dance battle hype reel with dynamic speed ramps and lighting flairs.', fps: 30, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Art of Flight 3 — Alpine Snowboard Cinema', desc: 'Heavy-lift RED helicopter aerials following big mountain lines in the Alaskan backcountry.', fps: 24, colorSpace: 'ACEScg', thumbnail: 'https://images.unsplash.com/photo-1482867996988-29ec3a0f1aac?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=JGwWNGJdvx8' },
      { title: 'Red Bull Hardline — Downhill POV Extreme', desc: 'Unfiltered helmet camera 4K stabilized pass on the world’s most dangerous mountain bike track.', fps: 60, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'B-Boy BC One — Cypher Spotlight', desc: 'Cinematic profile film focusing on breakdancing acrobatics and underground hip-hop culture.', fps: 25, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1535525153412-5a42439a210d?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' },
      { title: 'Air Race Budapest — Pylon Slalom 4K', desc: 'Aerobatic plane cockpit footage pulling 12G through inflatable pylons over the Danube river.', fps: 60, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'SoundClash Arena — Live Clash Cut', desc: 'Multi-cam 12-camera live concert switch of sound system reggae and dubplate warfare.', fps: 25, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
    ],
  },
  {
    id: 'client_adidas',
    name: 'Adidas Originals',
    companyName: 'Adidas AG',
    email: 'campaigns@adidas.com',
    phone: '+49 9132 84 0',
    accentColor: '#0051BA',
    logoUrl: 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=200&auto=format&fit=crop&q=80',
    industry: 'Athletic Footwear & Apparel',
    website: 'https://adidas.com',
    notes: 'Classic Trefoil aesthetic, vintage film grain emulation, contemporary editorial styling.',
    projectThemes: [
      { title: 'Ultraboost Light — Kinetic Velocity', desc: 'Cinematic shoe spot combining practical macro cinematography with dynamic CGI particulate simulations.', fps: 24, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Samba & Gazelle — Streets of Berlin', desc: 'Grainy 16mm film documentary celebrating timeless terrace culture and European street style.', fps: 24, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' },
      { title: 'Predator 2026 — Strike Precision', desc: 'Dark brooding stadium commercial featuring world-class strikers bending balls with CGI trajectories.', fps: 60, colorSpace: 'ACEScg', thumbnail: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Y-3 Yohji Yamamoto — Avant-Garde Runway', desc: 'Minimalist monochrome high fashion film set to deep sub-bass atmospheric soundscapes.', fps: 24, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
      { title: 'Terrex Free Hiker — Alpine Ascent', desc: 'Extreme weather mountain expedition commercial shot across the Swiss Alps in pouring rain and snow.', fps: 25, colorSpace: 'Rec.2020', thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Originals Superstar — Tokyo Cypher', desc: 'Vibrant neon Shibuya night photography spotlighting dancers and hip hop beatmakers.', fps: 30, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=JGwWNGJdvx8' },
      { title: 'Adizero Adios Pro — Marathon Record Break', desc: 'Sweat, heart rate, and cadence documentary detailing the breaking of the sub-2 hour marathon barrier.', fps: 24, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Stella McCartney x Adidas — Eco Couture', desc: 'Biodegradable fabric and ocean plastic innovation visualized through organic fluid motion design.', fps: 24, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' },
      { title: 'Club World Cup Kit Reveal — 3D Hologram', desc: 'Unreal Engine 5 real-time 3D jersey reveal with reactive stadium crowd lighting.', fps: 60, colorSpace: 'ACEScg', thumbnail: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Impossible Is Nothing — 75th Anniversary', desc: 'Emotional montage stitching together 75 years of historic sports triumphs with remastered audio.', fps: 24, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
    ],
  },
  {
    id: 'client_nike',
    name: 'Nike Global',
    companyName: 'Nike Inc.',
    email: 'campaigns@nike.com',
    phone: '+1 503 671 6453',
    accentColor: '#111111',
    logoUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80',
    industry: 'Sportswear & Innovation',
    website: 'https://nike.com',
    notes: 'Requires 16:9 widescreen master + 9:16 vertical reframe exports for social rollout.',
    projectThemes: [
      { title: 'Air Max 2026 — Velocity Launch', desc: 'Global flagship product reveal featuring dynamic VFX transitions and sound design.', fps: 24, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Nike Basketball — Greater Than Series', desc: 'High-octane hardwood cinematography with intense rim-mic audio and sneaker squeak foley.', fps: 60, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' },
      { title: 'Nike Football — Winner Stays On', desc: 'Viral street football cage tournament commercial starring international superstar players.', fps: 25, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Nike ISPA — Improvise Scavenge Protect', desc: 'Experimental mixed media spot dissecting modular sustainable futuristic footwear design.', fps: 24, colorSpace: 'ACEScg', thumbnail: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
      { title: 'Nike Running — Mind Over Miles', desc: 'Early morning moody dawn running documentary tracking grit through foggy city streets.', fps: 24, colorSpace: 'Rec.2020', thumbnail: 'https://images.unsplash.com/photo-1502224562085-639556652f33?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Nike SB — Love Letters to Skateboarding', desc: 'Raw VX1000 fisheye street skateboarding clips merged with high-end anamorphic slow motion.', fps: 30, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=JGwWNGJdvx8' },
      { title: 'Nike Training Club — Pro Athlete Workouts', desc: 'Crisp commercial training videos detailing HIIT, strength, and mobility routines.', fps: 60, colorSpace: 'sRGB', thumbnail: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Nike ACG — All Conditions Gear Iceland', desc: 'Volcanic black sand and glacier waterfall cinema showcasing waterproof technical outerwear.', fps: 24, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' },
      { title: 'Nike Jordan Brand — Wings Over Paris', desc: 'Quai 54 streetball championship documentary honoring Parisian hoop culture and lifestyle.', fps: 25, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1579338559194-a162d19bf842?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Nike Flyknit — Thread to Thread', desc: 'Macro probe lens journey through micro-engineered robotic yarn weaving patterns.', fps: 60, colorSpace: 'ACEScg', thumbnail: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
    ],
  },
  {
    id: 'client_spotify',
    name: 'Spotify Studios',
    companyName: 'Spotify AB',
    email: 'video@spotify.com',
    phone: '+46 8 501 645 00',
    accentColor: '#1DB954',
    logoUrl: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=200&auto=format&fit=crop&q=80',
    industry: 'Audio Streaming & Podcasts',
    website: 'https://spotify.com',
    notes: 'Exclusive artist sessions and global Wrapped campaign deliverables.',
    projectThemes: [
      { title: 'Spotify Wrapped 2026 — Creator Spotlight', desc: 'Mini-documentary series celebrating breakthrough international artists.', fps: 25, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Spotify Singles — Abbey Road Live Session', desc: 'Warm intimate live studio session recorded on vintage Neve consoles in London.', fps: 24, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' },
      { title: 'RADAR Global — Emerging Voices Doc', desc: 'Cinematic docuseries following grassroots musicians from Lagos, Seoul, and Cairo.', fps: 24, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'RapCaviar Live — Stadium Concert Film', desc: 'High-contrast pyro and laser heavy concert film capturing hip hop festival headliners.', fps: 60, colorSpace: 'ACEScg', thumbnail: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
      { title: 'Billions Club — The 1B Stream Plates', desc: 'Artisanal culinary style mini-docs presenting platinum plaque awards to legendary acts.', fps: 24, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Spotify Car Thing 2 — Connected Drive', desc: 'Clean automotive interior tech commercial demonstrating voice-activated playlist curation.', fps: 30, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=JGwWNGJdvx8' },
      { title: 'Soundtracking Your World — Brand Film', desc: 'Emotive multi-vignette storytelling illustrating how music anchors memories throughout life.', fps: 24, colorSpace: 'Rec.2020', thumbnail: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'The Joe Rogan Experience — 4K Multicam', desc: 'Studio lighting overhaul and multicam switching test cuts for high profile video podcast.', fps: 30, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' },
      { title: 'Viva Latino — Miami Night Sessions', desc: 'Sunkissed color grade and infectious salsa rhythms celebrating reggaeton global dominance.', fps: 25, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'AI DJ X — Neural Mix Launch', desc: 'Glitch art and holographic typography introducing personalized voice-driven generative music DJ.', fps: 60, colorSpace: 'ACEScg', thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
    ],
  },
  {
    id: 'client_apple',
    name: 'Apple Original Content',
    companyName: 'Apple Inc.',
    email: 'post-media@apple.com',
    phone: '+1 408 996 1010',
    accentColor: '#A2AAAD',
    logoUrl: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=200&auto=format&fit=crop&q=80',
    industry: 'Consumer Tech & Cinema',
    website: 'https://apple.com',
    notes: 'Immaculate minimalism, Apple Pro Display XDR color compliance, DCI-P3 mastering.',
    projectThemes: [
      { title: 'Apple Vision Pro — Spatial Cinema Suite', desc: 'Immersive stereoscopic 8K spatial video demo highlighting boundary-free personal theater playback.', fps: 24, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'iPhone Pro Cinema — Shot on iPhone 16 Pro', desc: 'Theatrical short film captured entirely in Apple ProRes Log 4K 120fps with anamorphic adapters.', fps: 24, colorSpace: 'ACEScg', thumbnail: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' },
      { title: 'MacBook Pro M4 Max — Extreme VFX Workflow', desc: 'Real-time 8K render stress test commercial featuring complex 3D fluids and Houdini simulations.', fps: 60, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Apple TV+ — Foundation Season 3 Trailer', desc: 'Galactic empire sci-fi VFX breakdown and official teaser cut with massive space battles.', fps: 24, colorSpace: 'Rec.2020', thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
      { title: 'AirPods Max 2 — Spatial Audio Symphony', desc: 'Dolby Atmos immersive audio commercial with floating instrument orchestra surrounding listener.', fps: 24, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Apple Watch Ultra 3 — Oceanic Abyss', desc: 'Subsea diving documentary testing 100m water resistance and titanium enclosure in Norwegian fjords.', fps: 30, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=JGwWNGJdvx8' },
      { title: 'Apple Music Live — Billie Eilish London', desc: 'Live multi-cam concert master cut in HDR with seamless dynamic range preservation.', fps: 25, colorSpace: 'Rec.2020', thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'iPad Pro OLED — Precision Canvas', desc: 'Digital painters and animation masters collaborating live using Apple Pencil Pro haptics.', fps: 60, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' },
      { title: 'Mother Nature — 2030 Carbon Neutrality', desc: 'Corporate environmental report film featuring Hollywood casting and witty executive dialogue.', fps: 24, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Apple Design Awards 2026 — Nominee Film', desc: 'Masterclass profiles of visionary independent app developers reshaping UI design patterns.', fps: 24, colorSpace: 'sRGB', thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
    ],
  },
  {
    id: 'client_porsche',
    name: 'Porsche Motorsport',
    companyName: 'Dr. Ing. h.c. F. Porsche AG',
    email: 'media@porsche.de',
    phone: '+49 711 911 0',
    accentColor: '#D5001C',
    logoUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=200&auto=format&fit=crop&q=80',
    industry: 'Automotive & Supercars',
    website: 'https://porsche.com',
    notes: 'Exacting German engineering aesthetic, deep metallic paint reflections, 24fps cinema.',
    projectThemes: [
      { title: '911 GT3 RS — Nürburgring Record Lap', desc: 'High-downforce aerodynamic telemetry and cockpit camera record breaking lap on the Nordschleife.', fps: 60, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Taycan Turbo GT — Electric Drift Film', desc: 'Tire smoke and electric torque orchestrated in slow motion across frozen Scandinavian test tracks.', fps: 24, colorSpace: 'ACEScg', thumbnail: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' },
      { title: '24 Hours of Le Mans — Hypercar Documentary', desc: 'Behind the scenes inside the Porsche Penske 963 pit garage through dark rainy night stints.', fps: 25, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Porsche 911 Dakar — Sahara Sandstorm', desc: 'Heavy lift heavy dust cinematic drone passes drifting over Moroccan desert sand dunes.', fps: 24, colorSpace: 'Rec.2020', thumbnail: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
      { title: 'Porsche Sonderwunsch — Bespoke Heritage', desc: 'Macro probe lens capturing hand-stitched leather seams and custom multi-coat paint formulas in Zuffenhausen.', fps: 24, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: '718 Cayman GT4 RS — Flat-Six Scream', desc: 'Induction roar sound design highlighting 9,000 RPM naturally aspirated engine intake acoustics.', fps: 60, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=JGwWNGJdvx8' },
      { title: 'Porsche E-Performance — Formula E Teaser', desc: 'City street circuit night races lit by hyper-bright kinetic LED curbs in Tokyo and Monaco.', fps: 30, colorSpace: 'ACEScg', thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Porsche 917 Tribute — Racing Legends', desc: 'Archival 35mm film restoration mixed with modern 4K tracking passes of Gulf livery icon.', fps: 24, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' },
      { title: 'Panamera Executive — The Night Drive', desc: 'Atmospheric urban rain cinema capturing rear seat luxury and adaptive matrix LED headlights.', fps: 24, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Porsche Macan Electric — Urban Nomad', desc: 'Fast dynamic lifestyle spot capturing zero-emission daily performance and rapid charging.', fps: 30, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
    ],
  },
  {
    id: 'client_playstation',
    name: 'Sony PlayStation Studios',
    companyName: 'Sony Interactive Entertainment',
    email: 'broadcast@playstation.sony.com',
    phone: '+1 650 655 8000',
    accentColor: '#003791',
    logoUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=200&auto=format&fit=crop&q=80',
    industry: 'Competitive Gaming & Entertainment',
    website: 'https://playstation.com',
    notes: '60fps high frame rate trailers, HDR gaming graphics, Dolby Atmos audio mix.',
    projectThemes: [
      { title: 'PlayStation 5 Pro — Spectral Super Resolution', desc: 'Next-gen ray tracing graphics comparison commercial showcasing 60fps 4K fidelity.', fps: 60, colorSpace: 'ACEScg', thumbnail: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'God of War Ragnarök — Live Action Epic', desc: 'Theatrical live-action commercial blending real actors with hyper-realistic CGI Leviathan axe VFX.', fps: 24, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' },
      { title: 'Ghost of Yōtei — Cinematic Announcement', desc: 'Breathtaking feudal Japan landscapes with dynamic autumn leaf physics and samurai sword foley.', fps: 24, colorSpace: 'Rec.2020', thumbnail: 'https://images.unsplash.com/photo-1528164344705-475426879c0d?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Marvel’s Spider-Man 2 — Venom Boss Cut', desc: 'High-speed web swinging camera work and fluid symbiote tendril particle simulation sequences.', fps: 60, colorSpace: 'ACEScg', thumbnail: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
      { title: 'DualSense Wireless — Haptic Sensation Spot', desc: 'Abstract tactile CGI animations translating trigger resistance and subtle surface textures.', fps: 30, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Gran Turismo 7 — 24H Nürburgring Sunset', desc: 'Photorealistic raytraced car models reflecting golden hour sunlight and asphalt heat haze.', fps: 60, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=JGwWNGJdvx8' },
      { title: 'PlayStation VR2 — Enter the Horizon', desc: 'Gaze tracking and OLED HDR headset demo following robotic mechanical dinosaurs.', fps: 60, colorSpace: 'ACEScg', thumbnail: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'The Last of Us Part II — Remastered Documentary', desc: 'Feature length documentary exploring motion capture performance and character animation pipelines.', fps: 24, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' },
      { title: 'PlayStation State of Play — Opening Hype Intro', desc: 'Fast kinetic montage stitching together upcoming exclusive AAA releases with pulsing synth track.', fps: 60, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Astro Bot — Joy of Gaming Anthem', desc: 'Whimsical 3D character animation spot celebrating 30 years of PlayStation nostalgia and easter eggs.', fps: 60, colorSpace: 'sRGB', thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
    ],
  },
  {
    id: 'client_netflix',
    name: 'Netflix Originals',
    companyName: 'Netflix Inc.',
    email: 'post-production@netflix.com',
    phone: '+1 408 540 3700',
    accentColor: '#E50914',
    logoUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=200&auto=format&fit=crop&q=80',
    industry: 'Theatrical Cinema & Streaming',
    website: 'https://netflix.com',
    notes: 'Strict Dolby Vision 4K master specifications, IMF container delivery, ACEScc grade.',
    projectThemes: [
      { title: 'Stranger Things 5 — Final Season Teaser', desc: 'Upside Down alternate dimension VFX composite with floating spore particles and 80s synth score.', fps: 24, colorSpace: 'ACEScg', thumbnail: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Formula 1: Drive to Survive 8 — Season Opener', desc: 'Raw high-adrenaline team radio communications combined with dramatic trackside slow motion.', fps: 25, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' },
      { title: 'Wednesday Season 2 — Nevermore Secrets', desc: 'Gothic low-key lighting aesthetic and intricate hand-puppeteered Thing VFX breakdowns.', fps: 24, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Squid Game 2 — The Return Trailer', desc: 'Vibrant surreal playground sets contrasted with intense psychological suspense thriller editing.', fps: 24, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
      { title: 'Our Planet 3 — Polar Bear Migration', desc: 'Groundbreaking 8K telephoto wildlife cinematography showing melting ice sheets in high dynamic range.', fps: 24, colorSpace: 'Rec.2020', thumbnail: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Arcane Season 2 — Paint & Powder VFX Cut', desc: 'Hand-painted mixed 2D/3D anime aesthetic and emotional orchestral battle soundtrack.', fps: 24, colorSpace: 'ACEScg', thumbnail: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=JGwWNGJdvx8' },
      { title: 'The Crown Prequel — Royal Heritage Look', desc: 'Rich warm 35mm film emulation with vintage Cooke anamorphic lens flares and historic period sets.', fps: 24, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Cyberpunk Edgerunners Live — Night City Hype', desc: 'Neon saturated city hologram composites, explosion passes, and wire removal.', fps: 24, colorSpace: 'ACEScg', thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' },
      { title: 'Netflix Tudum 2026 — Global Fan Event Live', desc: 'Live multi-location satellite broadcast package connecting Seoul, São Paulo, and Los Angeles.', fps: 30, colorSpace: 'Rec.709', thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      { title: 'Extraction 3 — One-Shot Action Breakdown', desc: 'Continuous 15-minute seamless oneer action camera sequence breakdown with hidden digital stitches.', fps: 24, colorSpace: 'DCI-P3', thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80', videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
    ],
  },
];

// ----------------------------------------------------
// GENERATE ALL 50 TOP GLOBAL CLIENTS WITH 10 PROJECTS EACH
// ----------------------------------------------------
const EXTENDED_BRANDS = [
  { id: 'client_cocacola', name: 'Coca-Cola Global', companyName: 'The Coca-Cola Company', email: 'media@coca-cola.com', phone: '+1 404 676 2121', accentColor: '#F40009', logoUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=200&auto=format&fit=crop&q=80', industry: 'Beverage & Global FMCG', website: 'https://coca-cola.com', notes: 'Classic Coca-Cola Red, bubbly refreshing dynamic fluid foley, holiday campaigns.' },
  { id: 'client_samsung', name: 'Samsung Galaxy', companyName: 'Samsung Electronics', email: 'galaxy@samsung.com', phone: '+82 2 2255 0114', accentColor: '#1428A0', logoUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=200&auto=format&fit=crop&q=80', industry: 'Mobile & Consumer Tech', website: 'https://samsung.com', notes: 'Galaxy AI smartphone camera demos, folding screen hinge macro cinema.' },
  { id: 'client_bmw', name: 'BMW M Motorsport', companyName: 'Bayerische Motoren Werke AG', email: 'motorsport@bmw.de', phone: '+49 89 382 0', accentColor: '#0066B1', logoUrl: 'https://images.unsplash.com/photo-1555353540-64580b51c258?w=200&auto=format&fit=crop&q=80', industry: 'Automotive & Supercars', website: 'https://bmw-m.com', notes: 'M Power performance engineering, track drift cinematography, aggressive exhaust acoustics.' },
  { id: 'client_mercedes', name: 'Mercedes-AMG', companyName: 'Mercedes-Benz Group AG', email: 'amg@mercedes-benz.com', phone: '+49 711 17 0', accentColor: '#00A19B', logoUrl: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=200&auto=format&fit=crop&q=80', industry: 'Automotive & Supercars', website: 'https://mercedes-amg.com', notes: 'Handcrafted precision V8 twin-turbo sound, luxury dark aesthetic.' },
  { id: 'client_rolex', name: 'Rolex Official', companyName: 'Rolex SA', email: 'media@rolex.com', phone: '+41 22 302 22 00', accentColor: '#006039', logoUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&auto=format&fit=crop&q=80', industry: 'Haute Horlogerie & Timepieces', website: 'https://rolex.com', notes: 'Jubilee gold and green macro watch movement cinema, Wimbledon & F1 timing assets.' },
  { id: 'client_emirates', name: 'Emirates Airline', companyName: 'The Emirates Group', email: 'brand@emirates.com', phone: '+971 600 555555', accentColor: '#D71A21', logoUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=200&auto=format&fit=crop&q=80', industry: 'Aviation & Luxury Travel', website: 'https://emirates.com', notes: 'First class suite luxury cinema, A380 aerial photography, global destination guides.' },
  { id: 'client_riot', name: 'Riot Games Esports', companyName: 'Riot Games Inc.', email: 'esports@riotgames.com', phone: '+1 424 231 1111', accentColor: '#D9333F', logoUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80', industry: 'Competitive Gaming & Esports', website: 'https://riotgames.com', notes: 'League of Legends Worlds & VALORANT Champions hype packages.' },
  { id: 'client_openai', name: 'OpenAI Research', companyName: 'OpenAI L.L.C.', email: 'press@openai.com', phone: '+1 415 678 1234', accentColor: '#10A37F', logoUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=200&auto=format&fit=crop&q=80', industry: 'Artificial Intelligence & Tech', website: 'https://openai.com', notes: 'Sora text-to-video showcase, GPT-4o real-time voice and vision demonstrations.' },
  { id: 'client_tesla', name: 'Tesla Motors', companyName: 'Tesla Inc.', email: 'press@tesla.com', phone: '+1 512 516 8177', accentColor: '#E82127', logoUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=200&auto=format&fit=crop&q=80', industry: 'Clean Energy & Electric Mobility', website: 'https://tesla.com', notes: 'Cybertruck stainless steel geometry, Full Self-Driving neural net visualizations.' },
  { id: 'client_f1', name: 'Formula 1 Official', companyName: 'Formula One World Championship Ltd', email: 'press@f1.com', phone: '+44 20 7584 7200', accentColor: '#E10600', logoUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=200&auto=format&fit=crop&q=80', industry: 'Automotive & Supercars', website: 'https://formula1.com', notes: 'Championship broadcasts, qualifying shootouts, high-speed thermal tire cameras.' },
  { id: 'client_gucci', name: 'Gucci Creative Hub', companyName: 'Kering Group', email: 'fashion@gucci.com', phone: '+39 055 759221', accentColor: '#10B981', logoUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=200&auto=format&fit=crop&q=80', industry: 'Luxury Fashion & Leather Goods', website: 'https://gucci.com', notes: 'Milan Fashion Week runway cinema, vintage 70s grain looks, high fashion leather accessories.' },
  { id: 'client_warner', name: 'Warner Bros. Pictures', companyName: 'Warner Bros. Discovery', email: 'vfx@warnerbros.com', phone: '+1 818 954 6000', accentColor: '#0057B8', logoUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=200&auto=format&fit=crop&q=80', industry: 'Theatrical Cinema & Streaming', website: 'https://wbd.com', notes: 'Theatrical blockbusters, DC Universe superheroes, Dune IMAX scale cinematography.' },
  { id: 'client_dior', name: 'Christian Dior', companyName: 'LVMH Moët Hennessy Louis Vuitton', email: 'press@dior.com', phone: '+33 1 40 73 73 73', accentColor: '#C4A482', logoUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200&auto=format&fit=crop&q=80', industry: 'Luxury Fashion & Leather Goods', website: 'https://dior.com', notes: 'Haute couture Paris fashion shows, Miss Dior fragrance campaigns.' },
  { id: 'client_easports', name: 'EA Sports FC', companyName: 'Electronic Arts Inc.', email: 'easports@ea.com', phone: '+1 650 628 1500', accentColor: '#00E59B', logoUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80', industry: 'Competitive Gaming & Esports', website: 'https://ea.com', notes: 'HyperMotionV volumetric capture and Ultimate Team trailer reveals.' },
  { id: 'client_ferrari', name: 'Scuderia Ferrari', companyName: 'Ferrari S.p.A.', email: 'media@ferrari.com', phone: '+39 0536 949111', accentColor: '#FF2800', logoUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=200&auto=format&fit=crop&q=80', industry: 'Automotive & Supercars', website: 'https://ferrari.com', notes: 'Rosso Corsa perfection, Maranello factory handcrafted V12 cinema.' },
  { id: 'client_mclaren', name: 'McLaren Automotive', companyName: 'McLaren Group Ltd', email: 'media@mclaren.com', phone: '+44 1483 261500', accentColor: '#FF8000', logoUrl: 'https://images.unsplash.com/photo-1621135802920-133df287f89c?w=200&auto=format&fit=crop&q=80', industry: 'Automotive & Supercars', website: 'https://mclaren.com', notes: 'Papaya Orange Formula 1 aerodynamics and carbon fiber monocoque supercars.' },
  { id: 'client_hbo', name: 'HBO Max Originals', companyName: 'Warner Bros. Discovery', email: 'press@hbo.com', phone: '+1 212 512 1000', accentColor: '#7E22CE', logoUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=200&auto=format&fit=crop&q=80', industry: 'Theatrical Cinema & Streaming', website: 'https://hbomax.com', notes: 'Prestige television drama (House of the Dragon, The White Lotus, The Last of Us).' },
  { id: 'client_cartier', name: 'Cartier High Jewelry', companyName: 'Richemont International', email: 'contact@cartier.com', phone: '+33 1 42 18 43 00', accentColor: '#8B0000', logoUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&auto=format&fit=crop&q=80', industry: 'Haute Horlogerie & Timepieces', website: 'https://cartier.com', notes: 'Panthère de Cartier fine diamond jewellery, Paris Place Vendôme atelier cinema.' },
  { id: 'client_hermanmiller', name: 'Herman Miller', companyName: 'MillerKnoll Inc.', email: 'design@hermanmiller.com', phone: '+1 888 798 0202', accentColor: '#FF4438', logoUrl: 'https://images.unsplash.com/photo-1580481077195-c9a93077d70c?w=200&auto=format&fit=crop&q=80', industry: 'Architectural Cinema & Furniture', website: 'https://hermanmiller.com', notes: 'Aeron and Eames architectural design heritage, ergonomic workplace cinema.' },
  { id: 'client_beats', name: 'Beats by Dre', companyName: 'Apple Inc.', email: 'press@beatsbydre.com', phone: '+1 800 442 4000', accentColor: '#E01F3D', logoUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200&auto=format&fit=crop&q=80', industry: 'Acoustic Engineering & Audio', website: 'https://beatsbydre.com', notes: 'High-energy NBA athlete commercials, heavy punchy bass sound design.' },
  { id: 'client_louisvuitton', name: 'Louis Vuitton', companyName: 'LVMH Group', email: 'press@louisvuitton.com', phone: '+33 9 77 40 40 77', accentColor: '#8B6B4B', logoUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&auto=format&fit=crop&q=80', industry: 'Luxury Fashion & Leather Goods', website: 'https://louisvuitton.com', notes: 'Monogram leather luggage travel documentaries and Pont Neuf runway shows.' },
  { id: 'client_starbucks', name: 'Starbucks Coffee', companyName: 'Starbucks Corporation', email: 'media@starbucks.com', phone: '+1 206 447 1575', accentColor: '#006241', logoUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200&auto=format&fit=crop&q=80', industry: 'Beverage & Global FMCG', website: 'https://starbucks.com', notes: 'Reserve Roastery bean-to-cup origin stories from Costa Rica and Ethiopia.' },
  { id: 'client_monster', name: 'Monster Energy', companyName: 'Monster Beverage Corp', email: 'info@monsterenergy.com', phone: '+1 951 739 6200', accentColor: '#95D600', logoUrl: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=200&auto=format&fit=crop&q=80', industry: 'Extreme Sports & Entertainment', website: 'https://monsterenergy.com', notes: 'Supercross stadium stunts, Gymkhana tire slaying, raw high adrenaline edits.' },
  { id: 'client_tiktok', name: 'TikTok Global', companyName: 'ByteDance Ltd', email: 'pr@tiktok.com', phone: '+1 310 555 0199', accentColor: '#FE2C55', logoUrl: 'https://images.unsplash.com/photo-1596558450255-7c0b7be9d56a?w=200&auto=format&fit=crop&q=80', industry: 'Audio Streaming & Podcasts', website: 'https://tiktok.com', notes: 'Vertical 9:16 viral trends, sound synchronization, creator marketplace reels.' },
  { id: 'client_instagram', name: 'Instagram Meta', companyName: 'Meta Platforms Inc.', email: 'press@instagram.com', phone: '+1 650 543 4800', accentColor: '#C13584', logoUrl: 'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=200&auto=format&fit=crop&q=80', industry: 'Audio Streaming & Podcasts', website: 'https://instagram.com', notes: 'Reels visual storytelling, fashion aesthetics, creator community showcases.' },
  { id: 'client_astonmartin', name: 'Aston Martin Racing', companyName: 'Aston Martin Lagonda Global', email: 'media@astonmartin.com', phone: '+44 1926 644644', accentColor: '#00594F', logoUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=200&auto=format&fit=crop&q=80', industry: 'Automotive & Supercars', website: 'https://astonmartin.com', notes: 'Valkyrie hypercar aerodynamics, James Bond cinematic espionage heritage.' },
  { id: 'client_airbnb', name: 'Airbnb Experiences', companyName: 'Airbnb Inc.', email: 'press@airbnb.com', phone: '+1 415 800 5959', accentColor: '#FF5A5F', logoUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=200&auto=format&fit=crop&q=80', industry: 'Aviation & Luxury Travel', website: 'https://airbnb.com', notes: 'Architectural treehouses, private Tuscan villas, authentic local culture documentaries.' },
  { id: 'client_xbox', name: 'Xbox Game Studios', companyName: 'Microsoft Corporation', email: 'xboxpr@microsoft.com', phone: '+1 425 882 8080', accentColor: '#107C10', logoUrl: 'https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=200&auto=format&fit=crop&q=80', industry: 'Competitive Gaming & Esports', website: 'https://xbox.com', notes: 'Game Pass blockbuster trailers (Halo, Forza Horizon, Starfield, Gears of War).' },
  { id: 'client_bose', name: 'Bose Corporation', companyName: 'Bose Corporation', email: 'press@bose.com', phone: '+1 508 879 7330', accentColor: '#111111', logoUrl: 'https://images.unsplash.com/photo-1545127398-14699f92334b?w=200&auto=format&fit=crop&q=80', industry: 'Acoustic Engineering & Audio', website: 'https://bose.com', notes: 'QuietComfort active noise cancelling science, immersive acoustic chamber tests.' },
  { id: 'client_fender', name: 'Fender Guitars', companyName: 'Fender Musical Instruments Corp', email: 'media@fender.com', phone: '+1 480 596 9690', accentColor: '#ED1C24', logoUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80', industry: 'Acoustic Engineering & Audio', website: 'https://fender.com', notes: 'Stratocaster & Telecaster custom shop hand-wound pickup tone masterclasses.' },
  { id: 'client_lego', name: 'The LEGO Group', companyName: 'LEGO System A/S', email: 'media@lego.com', phone: '+45 79 50 60 70', accentColor: '#D11013', logoUrl: 'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=200&auto=format&fit=crop&q=80', industry: 'Extreme Sports & Entertainment', website: 'https://lego.com', notes: 'Stop-motion brick animation cinema, Technic supercar builds, Star Wars UCS sets.' },
  { id: 'client_ubisoft', name: 'Ubisoft Entertainment', companyName: 'Ubisoft S.A.', email: 'press@ubisoft.com', phone: '+33 1 48 18 50 00', accentColor: '#0066FF', logoUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=200&auto=format&fit=crop&q=80', industry: 'Competitive Gaming & Esports', website: 'https://ubisoft.com', notes: 'Assassin’s Creed historic recreations, Rainbow Six Siege tactical esports trailers.' },
  { id: 'client_sephora', name: 'Sephora Global', companyName: 'LVMH Group', email: 'press@sephora.com', phone: '+33 1 46 09 34 00', accentColor: '#000000', logoUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&auto=format&fit=crop&q=80', industry: 'Luxury Fashion & Leather Goods', website: 'https://sephora.com', notes: 'Beauty tutorials, clean skincare macro textures, cosmetics runway showcases.' },
  { id: 'client_loreal', name: 'L’Oréal Paris', companyName: 'L’Oréal S.A.', email: 'media@loreal.com', phone: '+33 1 47 56 70 00', accentColor: '#E2007A', logoUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&auto=format&fit=crop&q=80', industry: 'Luxury Fashion & Leather Goods', website: 'https://loreal.com', notes: 'Cannes Film Festival red carpet beauty cinema, glossy haircare slow-motion.' },
  { id: 'client_balenciaga', name: 'Balenciaga Paris', companyName: 'Kering S.A.', email: 'press@balenciaga.com', phone: '+33 1 56 52 17 00', accentColor: '#000000', logoUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=200&auto=format&fit=crop&q=80', industry: 'Luxury Fashion & Leather Goods', website: 'https://balenciaga.com', notes: 'Dystopian rain and mud runway sets, oversized silhouettes, avant-garde editing.' },
  { id: 'client_chanel', name: 'Chanel Official', companyName: 'Chanel S.A.', email: 'press@chanel.com', phone: '+33 1 42 86 40 00', accentColor: '#1A1A1A', logoUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200&auto=format&fit=crop&q=80', industry: 'Luxury Fashion & Leather Goods', website: 'https://chanel.com', notes: 'Grand Palais couture runways, N°5 perfume cinema directed by acclaimed auteurs.' },
  { id: 'client_prada', name: 'Prada Milano', companyName: 'Prada S.p.A.', email: 'media@prada.com', phone: '+39 02 550281', accentColor: '#000000', logoUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=200&auto=format&fit=crop&q=80', industry: 'Luxury Fashion & Leather Goods', website: 'https://prada.com', notes: 'Architectural Fondazione Prada film exhibitions, nylon re-edition campaigns.' },
  { id: 'client_disney', name: 'Walt Disney Studios', companyName: 'The Walt Disney Company', email: 'press@disney.com', phone: '+1 818 560 1000', accentColor: '#113CCF', logoUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=200&auto=format&fit=crop&q=80', industry: 'Theatrical Cinema & Streaming', website: 'https://disney.com', notes: 'Pixar 3D animation finishing, Marvel Studios theatrical teasers, Disney+ releases.' },
  { id: 'client_paramount', name: 'Paramount Pictures', companyName: 'Paramount Global', email: 'press@paramount.com', phone: '+1 323 956 5000', accentColor: '#0064FF', logoUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=200&auto=format&fit=crop&q=80', industry: 'Theatrical Cinema & Streaming', website: 'https://paramount.com', notes: 'Top Gun & Mission Impossible practical stunt cinematography breakdowns.' },
  { id: 'client_zara', name: 'Zara Global', companyName: 'Inditex S.A.', email: 'press@zara.com', phone: '+34 981 18 54 00', accentColor: '#000000', logoUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=200&auto=format&fit=crop&q=80', industry: 'Luxury Fashion & Leather Goods', website: 'https://zara.com', notes: 'Weekly editorial lookbook films, dynamic supermodel outdoor vignettes.' },
  { id: 'client_heineken', name: 'Heineken Experience', companyName: 'Heineken N.V.', email: 'press@heineken.com', phone: '+31 20 523 9239', accentColor: '#007A33', logoUrl: 'https://images.unsplash.com/photo-1518176258769-f227c798150e?w=200&auto=format&fit=crop&q=80', industry: 'Beverage & Global FMCG', website: 'https://heineken.com', notes: 'UEFA Champions League matchday commercials, crisp green bottle hero pours.' },
];

// Helper project title generator for extended brands
const PROJECT_SUFFIXES = [
  { prefix: 'Global Flagship Commercial', desc: 'Theatrical 60s broadcast master shot on ARRI Alexa 35 with custom anamorphic primes.', fps: 24, cs: 'DCI-P3', thumb: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80', vid: 'https://www.youtube.com/watch?v=ScMzIvxBSi4' },
  { prefix: 'Autumn Heritage Campaign', desc: 'Moody editorial fashion and cinematic product reveal captured in Scottish highlands.', fps: 24, cs: 'Rec.709', thumb: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80', vid: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' },
  { prefix: 'Next-Gen Performance Spot', desc: 'High-speed 120fps motion control tracking shots with dynamic lighting pass transitions.', fps: 60, cs: 'ACEScg', thumb: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80', vid: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
  { prefix: 'Summer Digital Social Wave', desc: 'Viral 9:16 vertical cuts optimized for high engagement with kinetic sound design.', fps: 30, cs: 'sRGB', thumb: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80', vid: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
  { prefix: 'Origins & Craftsmanship Doc', desc: 'Intimate 4K documentary detailing artisans, raw materials, and precision manufacturing.', fps: 25, cs: 'Rec.2020', thumb: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80', vid: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { prefix: 'Midnight City Night Run', desc: 'Low-light Sony Venice 2 captures under neon streetlights with custom film grain overlay.', fps: 24, cs: 'DCI-P3', thumb: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80', vid: 'https://www.youtube.com/watch?v=JGwWNGJdvx8' },
  { prefix: 'Super Bowl XL Anthem Spot', desc: 'Epic stadium anthem spot with 5.1 surround sound mix and massive CGI crowd extensions.', fps: 24, cs: 'Rec.709', thumb: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80', vid: 'https://www.youtube.com/watch?v=ScMzIvxBSi4' },
  { prefix: '3D Hologram Product Reveal', desc: 'Unreal Engine 5 real-time 3D exploded view dissecting internal engineering layers.', fps: 60, cs: 'ACEScg', thumb: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', vid: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' },
  { prefix: 'Festival of Speed Live Cinema', desc: 'Live multi-camera broadcast stream package with real-time lower thirds and motion graphics.', fps: 50, cs: 'Rec.709', thumb: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80', vid: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
  { prefix: 'Eco Sustainability Manifesto', desc: 'Inspiring worldwide documentary spotlighting renewable energy and zero carbon innovations.', fps: 24, cs: 'Rec.2020', thumb: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&auto=format&fit=crop&q=80', vid: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
];

export const SEED_CLIENTS: Client[] = [];
export const SEED_PROJECTS: Project[] = [];
export const SEED_LOGS: ActivityLog[] = [];

// Build all 50 clients and 500 projects
let projectCounter = 1;

// 1. Add detailed curated clients
RAW_CLIENT_DEFINITIONS.forEach(c => {
  SEED_CLIENTS.push({
    id: c.id,
    companyId: 'comp_socialeyes',
    name: c.name,
    companyName: c.companyName,
    email: c.email,
    phone: c.phone,
    accentColor: c.accentColor,
    logoUrl: c.logoUrl,
    industry: c.industry,
    website: c.website,
    notes: c.notes,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  });

  c.projectThemes.forEach((p, pIdx) => {
    const projId = `proj_${c.id.replace('client_', '')}_${pIdx + 1}`;
    const statuses: ('client_review' | 'internal_review' | 'approved' | 'changes_requested' | 'delivered')[] = [
      'client_review', 'internal_review', 'approved', 'changes_requested', 'delivered',
      'client_review', 'internal_review', 'approved', 'client_review', 'approved',
    ];

    SEED_PROJECTS.push({
      id: projId,
      companyId: 'comp_socialeyes',
      clientId: c.id,
      name: `${c.name} — ${p.title}`,
      description: p.desc,
      fps: p.fps,
      dropFrame: false,
      startTimecode: '01:00:00:00',
      colorSpace: p.colorSpace,
      status: statuses[pIdx % statuses.length],
      primaryColor: c.accentColor,
      thumbnailUrl: p.thumbnail,
      assignedUserIds: ['user_sarah', 'user_david', 'user_leo'],
      createdAt: new Date(Date.now() - (50 - projectCounter * 0.1) * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
    projectCounter++;
  });
});

// 2. Add extended brands up to 50 clients total
EXTENDED_BRANDS.forEach(b => {
  SEED_CLIENTS.push({
    id: b.id,
    companyId: 'comp_socialeyes',
    name: b.name,
    companyName: b.companyName,
    email: b.email,
    phone: b.phone,
    accentColor: b.accentColor,
    logoUrl: b.logoUrl,
    industry: b.industry,
    website: b.website,
    notes: b.notes,
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
  });

  PROJECT_SUFFIXES.forEach((suf, sIdx) => {
    const projId = `proj_${b.id.replace('client_', '')}_${sIdx + 1}`;
    const statuses: ('client_review' | 'internal_review' | 'approved' | 'changes_requested' | 'delivered')[] = [
      'client_review', 'internal_review', 'approved', 'changes_requested', 'delivered',
      'client_review', 'internal_review', 'approved', 'client_review', 'approved',
    ];

    SEED_PROJECTS.push({
      id: projId,
      companyId: 'comp_socialeyes',
      clientId: b.id,
      name: `${b.name} — ${suf.prefix} [Cut ${sIdx + 1}]`,
      description: suf.desc,
      fps: suf.fps,
      dropFrame: false,
      startTimecode: '01:00:00:00',
      colorSpace: suf.cs,
      status: statuses[sIdx % statuses.length],
      primaryColor: b.accentColor,
      thumbnailUrl: suf.thumb,
      assignedUserIds: ['user_marcus', 'user_sarah', 'user_elena'],
      createdAt: new Date(Date.now() - (60 - (sIdx + 1) * 2) * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
    projectCounter++;
  });
});

// Seed recent activity logs for Socialeyes Studio
SEED_LOGS.push(
  {
    id: 'log_1',
    companyId: 'comp_socialeyes',
    projectId: 'proj_vodafone_1',
    userId: 'user_sarah',
    userName: 'Sarah Jenkins',
    userRole: 'company_admin',
    action: 'Dispatched Client Screener',
    details: 'Generated secure magic review link for Vodafone RED 5G Campaign',
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    id: 'log_2',
    companyId: 'comp_socialeyes',
    projectId: 'proj_redbull_1',
    userId: 'user_david',
    userName: 'David Sterling',
    userRole: 'creative',
    action: 'Completed Color Grade Pass',
    details: 'Exported DCI-P3 Rec.709 warm saturated master for Cliff Diving World Series',
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: 'log_3',
    companyId: 'comp_socialeyes',
    projectId: 'proj_apple_1',
    userId: 'user_maya',
    userName: 'Maya Lin',
    userRole: 'creative',
    action: 'Spatial Video Render Complete',
    details: 'Completed 8K stereoscopic compositing pass for Vision Pro Cinema Suite',
    createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
  {
    id: 'log_4',
    companyId: 'comp_socialeyes',
    projectId: 'proj_netflix_1',
    userId: 'user_elena',
    userName: 'Elena Rostova',
    userRole: 'account_manager',
    action: 'Approved Stage 4 Sign-Off',
    details: 'Netflix executive sign-off received for Stranger Things 5 Teaser trailer',
    createdAt: new Date(Date.now() - 14 * 3600000).toISOString(),
  }
);

// ----------------------------------------------------
// ASSETS, VERSIONS & REVIEW SESSIONS FOR ALL 500 PROJECTS
// ----------------------------------------------------
export const SEED_ASSETS: Asset[] = [];
export const SEED_VERSIONS: AssetVersion[] = [];
export const SEED_SESSIONS: ReviewSession[] = [];

const STREAM_SOURCES = [
  'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  'https://www.youtube.com/watch?v=e-ORhEE9VVg',
  'https://www.youtube.com/watch?v=WhY7uyc56Sc',
  'https://www.youtube.com/watch?v=R2fZ6bKk69A',
  'https://www.youtube.com/watch?v=YE7VzlLtp-4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
];

SEED_PROJECTS.forEach((proj, idx) => {
  const assetId = `asset_${proj.id}`;
  SEED_ASSETS.push({
    id: assetId,
    projectId: proj.id,
    companyId: 'comp_socialeyes',
    name: `${proj.name} — Master Sequence`,
    type: 'video',
    createdAt: proj.createdAt,
  });

  const sourceA = STREAM_SOURCES[idx % STREAM_SOURCES.length];
  const sourceB = STREAM_SOURCES[(idx + 3) % STREAM_SOURCES.length];

  SEED_VERSIONS.push(
    {
      id: `ver_${proj.id}_1`,
      assetId: assetId,
      projectId: proj.id,
      companyId: 'comp_socialeyes',
      versionNumber: 1,
      name: 'Cut 1 — Director’s Assembly',
      provider: sourceA.includes('youtube') ? 'youtube' : 'local',
      videoUrl: sourceA,
      durationSeconds: 120,
      uploadedByUserId: 'user_sarah',
      uploadedByUserName: 'Sarah Jenkins',
      createdAt: proj.createdAt,
    },
    {
      id: `ver_${proj.id}_2`,
      assetId: assetId,
      projectId: proj.id,
      companyId: 'comp_socialeyes',
      versionNumber: 2,
      name: 'Cut 2 — Color & Mix Master',
      provider: sourceB.includes('youtube') ? 'youtube' : 'local',
      videoUrl: sourceB,
      durationSeconds: 120,
      uploadedByUserId: 'user_david',
      uploadedByUserName: 'David Sterling',
      createdAt: new Date(new Date(proj.createdAt).getTime() + 86400000).toISOString(),
    }
  );

  SEED_SESSIONS.push({
    id: `session_${proj.id}`,
    projectId: proj.id,
    companyId: 'comp_socialeyes',
    title: `${proj.name} — Client Review Playlist`,
    status: 'active',
    playlistAssetIds: [assetId],
    hostUserId: 'user_marcus',
    allowClientDraw: true,
    allowClientGrade: true,
    allowClientVoice: true,
    allowClientExport: true,
    createdAt: proj.createdAt,
  });
});

// ----------------------------------------------------
// DATABASE INITIALIZATION & CRUD
// ----------------------------------------------------
const DB_VERSION_NUM = 5;

export function getTenantDB() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<TenantDB>(DB_NAME, DB_VERSION_NUM, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains('companies')) {
          db.createObjectStore('companies', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('by-company', 'companyId');
        }
        if (!db.objectStoreNames.contains('clients')) {
          const clientStore = db.createObjectStore('clients', { keyPath: 'id' });
          clientStore.createIndex('by-company', 'companyId');
        }
        if (!db.objectStoreNames.contains('projects')) {
          const projStore = db.createObjectStore('projects', { keyPath: 'id' });
          projStore.createIndex('by-company', 'companyId');
          projStore.createIndex('by-client', 'clientId');
        }
        if (!db.objectStoreNames.contains('assets')) {
          const assetStore = db.createObjectStore('assets', { keyPath: 'id' });
          assetStore.createIndex('by-project', 'projectId');
          assetStore.createIndex('by-company', 'companyId');
        }
        if (!db.objectStoreNames.contains('assetVersions')) {
          const verStore = db.createObjectStore('assetVersions', { keyPath: 'id' });
          verStore.createIndex('by-asset', 'assetId');
          verStore.createIndex('by-project', 'projectId');
        }
        if (!db.objectStoreNames.contains('reviewSessions')) {
          const sessStore = db.createObjectStore('reviewSessions', { keyPath: 'id' });
          sessStore.createIndex('by-project', 'projectId');
          sessStore.createIndex('by-company', 'companyId');
        }
        if (!db.objectStoreNames.contains('activityLogs')) {
          const logStore = db.createObjectStore('activityLogs', { keyPath: 'id' });
          logStore.createIndex('by-company', 'companyId');
          logStore.createIndex('by-project', 'projectId');
        }

        // On version upgrade, clear and seed fresh Socialeyes catalog with full assets
        const compStore = transaction.objectStore('companies');
        const clientStore = transaction.objectStore('clients');
        const projStore = transaction.objectStore('projects');
        const userStore = transaction.objectStore('users');
        const logStore = transaction.objectStore('activityLogs');
        const assetStore = transaction.objectStore('assets');
        const verStore = transaction.objectStore('assetVersions');
        const sessStore = transaction.objectStore('reviewSessions');

        compStore.clear();
        clientStore.clear();
        projStore.clear();
        userStore.clear();
        logStore.clear();
        assetStore.clear();
        verStore.clear();
        sessStore.clear();

        for (const c of SEED_COMPANIES) compStore.put(c);
        for (const u of SEED_USERS) userStore.put(u);
        for (const cl of SEED_CLIENTS) clientStore.put(cl);
        for (const p of SEED_PROJECTS) projStore.put(p);
        for (const l of SEED_LOGS) logStore.put(l);
        for (const a of SEED_ASSETS) assetStore.put(a);
        for (const v of SEED_VERSIONS) verStore.put(v);
        for (const s of SEED_SESSIONS) sessStore.put(s);
      },
    });
  }
  return dbPromise;
}

export async function initTenantSeed(): Promise<void> {
  const db = await getTenantDB();
  if (!db) return;

  const existingCompanies = await db.getAll('companies');
  if (existingCompanies.length === 0 || !existingCompanies.some(c => c.id === 'comp_socialeyes')) {
    for (const c of SEED_COMPANIES) await db.put('companies', c);
  }
  for (const u of SEED_USERS) {
    const existing = await db.get('users', u.id);
    if (!existing) await db.put('users', u);
  }
  const existingClients = await db.getAll('clients');
  if (existingClients.length < 50) {
    for (const cl of SEED_CLIENTS) await db.put('clients', cl);
    for (const p of SEED_PROJECTS) await db.put('projects', p);
    for (const l of SEED_LOGS) await db.put('activityLogs', l);
  }
  const existingAssets = await db.getAll('assets');
  if (existingAssets.length < 50) {
    for (const a of SEED_ASSETS) await db.put('assets', a);
  }
  const existingVersions = await db.getAll('assetVersions');
  if (existingVersions.length < 100) {
    for (const v of SEED_VERSIONS) await db.put('assetVersions', v);
  }
  const existingSessions = await db.getAll('reviewSessions');
  if (existingSessions.length < 50) {
    for (const s of SEED_SESSIONS) await db.put('reviewSessions', s);
  }
}

// ----------------------------------------------------
// COMPANIES (STUDIO TENANTS)
// ----------------------------------------------------
export async function getAllCompanies(): Promise<Company[]> {
  const db = await getTenantDB();
  if (!db) return SEED_COMPANIES;
  await initTenantSeed();
  const all = await db.getAll('companies');
  return all.length > 0 ? all : SEED_COMPANIES;
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const db = await getTenantDB();
  if (!db) return SEED_COMPANIES.find(c => c.id === id) || null;
  const c = await db.get('companies', id);
  return c || SEED_COMPANIES.find(comp => comp.id === id) || null;
}

export async function saveCompany(company: Company): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.put('companies', company);
}

// ----------------------------------------------------
// USERS & MEMBERS
// ----------------------------------------------------
export async function getAllUsers(): Promise<User[]> {
  const db = await getTenantDB();
  if (!db) return SEED_USERS;
  await initTenantSeed();
  const users = await db.getAll('users');
  return users.length > 0 ? users : SEED_USERS;
}

export async function getUserById(userId: string): Promise<User | null> {
  const db = await getTenantDB();
  if (!db) return SEED_USERS.find(u => u.id === userId) || null;
  await initTenantSeed();
  const user = await db.get('users', userId);
  return user || SEED_USERS.find(u => u.id === userId) || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await getTenantDB();
  const lower = email.trim().toLowerCase();
  if (!db) return SEED_USERS.find(u => u.email.toLowerCase() === lower) || null;
  await initTenantSeed();
  const users = await db.getAll('users');
  const found = users.find(u => u.email.toLowerCase() === lower);
  return found || SEED_USERS.find(u => u.email.toLowerCase() === lower) || null;
}

export async function getUsersByCompany(companyId: string): Promise<User[]> {
  const db = await getTenantDB();
  if (!db) return SEED_USERS.filter(u => u.companyId === companyId);
  await initTenantSeed();
  const users = await db.getAllFromIndex('users', 'by-company', companyId);
  return users.length > 0 ? users : SEED_USERS.filter(u => u.companyId === companyId);
}

export async function saveUser(user: User): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.put('users', user);
}

export async function deleteUser(userId: string): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.delete('users', userId);
}

// ----------------------------------------------------
// CLIENTS (50 CRM BRANDS)
// ----------------------------------------------------
export async function getClientsByCompany(companyId: string): Promise<Client[]> {
  const db = await getTenantDB();
  if (!db) return SEED_CLIENTS.filter(c => c.companyId === companyId);
  await initTenantSeed();
  const clients = await db.getAllFromIndex('clients', 'by-company', companyId);
  return (clients.length > 0 ? clients : SEED_CLIENTS.filter(c => c.companyId === companyId)).sort(
    (a, b) => a.name.localeCompare(b.name)
  );
}

export async function saveClient(client: Client): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.put('clients', client);
}

export async function updateClient(clientId: string, data: Partial<Client>): Promise<Client | null> {
  const db = await getTenantDB();
  const existing = db ? await db.get('clients', clientId) : SEED_CLIENTS.find(c => c.id === clientId);
  if (!existing) return null;
  const updated: Client = { ...existing, ...data, id: clientId };
  if (db) await db.put('clients', updated);
  return updated;
}

export async function deleteClient(clientId: string): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.delete('clients', clientId);
}

// ----------------------------------------------------
// PROJECTS (500 PRODUCTION PROJECTS)
// ----------------------------------------------------
export async function getProjectsByCompany(companyId: string): Promise<Project[]> {
  const db = await getTenantDB();
  if (!db) return SEED_PROJECTS.filter(p => p.companyId === companyId);
  await initTenantSeed();
  const projects = await db.getAllFromIndex('projects', 'by-company', companyId);
  return (projects.length > 0 ? projects : SEED_PROJECTS.filter(p => p.companyId === companyId)).sort(
    (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')
  );
}

export async function getProjectsByClient(clientId: string): Promise<Project[]> {
  const db = await getTenantDB();
  if (!db) return SEED_PROJECTS.filter(p => p.clientId === clientId);
  await initTenantSeed();
  const projects = await db.getAllFromIndex('projects', 'by-client', clientId);
  return (projects.length > 0 ? projects : SEED_PROJECTS.filter(p => p.clientId === clientId)).sort(
    (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')
  );
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  const db = await getTenantDB();
  if (!db) return SEED_PROJECTS.find(p => p.id === projectId) || null;
  const p = await db.get('projects', projectId);
  return p || SEED_PROJECTS.find(proj => proj.id === projectId) || null;
}

export async function saveProject(project: Project): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.put('projects', project);
}

export async function updateProject(projectId: string, data: Partial<Project>): Promise<Project | null> {
  const db = await getTenantDB();
  const existing = db ? await db.get('projects', projectId) : SEED_PROJECTS.find(p => p.id === projectId);
  if (!existing) return null;
  const updated: Project = { ...existing, ...data, id: projectId, updatedAt: new Date().toISOString() };
  if (db) await db.put('projects', updated);
  return updated;
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.delete('projects', projectId);
}

// ----------------------------------------------------
// ACTIVITY LOGS
// ----------------------------------------------------
export async function getActivityLogsByCompany(companyId: string): Promise<ActivityLog[]> {
  const db = await getTenantDB();
  if (!db) return SEED_LOGS.filter(l => l.companyId === companyId);
  await initTenantSeed();
  const logs = await db.getAllFromIndex('activityLogs', 'by-company', companyId);
  return (logs.length > 0 ? logs : SEED_LOGS.filter(l => l.companyId === companyId)).sort(
    (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')
  );
}

export async function logActivity(log: Omit<ActivityLog, 'id' | 'createdAt'>): Promise<void> {
  const db = await getTenantDB();
  const newLog: ActivityLog = {
    ...log,
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  if (db) await db.put('activityLogs', newLog);
}

// ----------------------------------------------------
// ASSETS & VERSIONS
// ----------------------------------------------------
export async function getAssetsByProject(projectId: string): Promise<Asset[]> {
  const db = await getTenantDB();
  if (!db) return SEED_ASSETS.filter(a => a.projectId === projectId);
  await initTenantSeed();
  const assets = await db.getAllFromIndex('assets', 'by-project', projectId);
  if (assets.length > 0) return assets;
  const seedMatches = SEED_ASSETS.filter(a => a.projectId === projectId);
  for (const a of seedMatches) {
    await db.put('assets', a);
  }
  return seedMatches;
}

export async function saveAsset(asset: Asset): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.put('assets', asset);
}

export async function deleteAsset(assetId: string): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.delete('assets', assetId);
}

export async function getAssetVersionsByProject(projectId: string): Promise<AssetVersion[]> {
  const db = await getTenantDB();
  if (!db) return SEED_VERSIONS.filter(v => v.projectId === projectId);
  await initTenantSeed();
  const versions = await db.getAllFromIndex('assetVersions', 'by-project', projectId);
  if (versions.length > 0) return versions;
  const seedMatches = SEED_VERSIONS.filter(v => v.projectId === projectId);
  for (const v of seedMatches) {
    await db.put('assetVersions', v);
  }
  return seedMatches;
}

export async function saveAssetVersion(version: AssetVersion): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.put('assetVersions', version);
}

// ----------------------------------------------------
// REVIEW SESSIONS
// ----------------------------------------------------
export async function getReviewSessionsByProject(projectId: string): Promise<ReviewSession[]> {
  const db = await getTenantDB();
  if (!db) return SEED_SESSIONS.filter(s => s.projectId === projectId);
  await initTenantSeed();
  const sessions = await db.getAllFromIndex('reviewSessions', 'by-project', projectId);
  if (sessions.length > 0) return sessions;
  const seedMatches = SEED_SESSIONS.filter(s => s.projectId === projectId);
  for (const s of seedMatches) {
    await db.put('reviewSessions', s);
  }
  return seedMatches;
}

export async function saveReviewSession(session: ReviewSession): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.put('reviewSessions', session);
}
